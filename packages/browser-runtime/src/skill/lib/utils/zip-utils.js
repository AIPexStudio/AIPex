/**
 * ZIP File Processing Utilities
 * Handles ZIP extraction and parsing for skill uploads
 */
import { strFromU8, unzipSync } from "fflate";
import { zenfs } from "../../../lib/vm/zenfs-manager";
export class SkillConflictError extends Error {
    constructor(skillName) {
        super(`Skill "${skillName}" already exists`);
        this.name = "SkillConflictError";
    }
}
/**
 * Parse SKILL.md content to extract metadata from YAML frontmatter
 */
export function parseSkillMetadata(markdown) {
    const frontmatterMatch = markdown.match(/^---\n(.*?)\n---/s);
    if (!frontmatterMatch) {
        throw new Error("No YAML frontmatter found in SKILL.md");
    }
    const frontmatter = frontmatterMatch[1];
    if (!frontmatter) {
        throw new Error("Empty YAML frontmatter in SKILL.md");
    }
    const nameMatch = frontmatter.match(/name:\s*(.+)/);
    const descMatch = frontmatter.match(/description:\s*(.+)/);
    const versionMatch = frontmatter.match(/version:\s*(.+)/);
    return {
        name: nameMatch?.[1]?.trim() ?? "unknown-skill",
        description: descMatch?.[1]?.trim() ?? "No description provided",
        version: versionMatch?.[1]?.trim() ?? "1.0.0",
    };
}
/**
 * Extract and parse SKILL.md from ZIP blob without extracting all files
 */
export async function parseSkillMetadataFromZip(zipBlob) {
    const arrayBuffer = await zipBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const unzipped = unzipSync(uint8Array);
    // Find SKILL.md in the ZIP
    let skillMdContent = null;
    for (const [path, data] of Object.entries(unzipped)) {
        // Skip macOS metadata and hidden files
        if (path.includes("__MACOSX/") ||
            path.includes("/._") ||
            path.includes(".DS_Store")) {
            continue;
        }
        // Look for SKILL.md (could be in root or nested in a directory)
        if (path.endsWith("SKILL.md") || path === "SKILL.md") {
            skillMdContent = strFromU8(data);
            break;
        }
    }
    if (!skillMdContent) {
        throw new Error("SKILL.md not found in ZIP file");
    }
    return parseSkillMetadata(skillMdContent);
}
/**
 * Check if a path should be filtered out (macOS metadata, hidden files, etc.)
 */
function shouldFilterPath(path) {
    // Skip macOS metadata files
    if (path.includes("__MACOSX/") || path.includes("/._")) {
        return true;
    }
    // Skip hidden files starting with ._
    if (path.split("/").some((part) => part.startsWith("._"))) {
        return true;
    }
    // Skip .DS_Store and other system files
    if (path.includes(".DS_Store") || path.includes("Thumbs.db")) {
        return true;
    }
    return false;
}
/**
 * Detect if ZIP has a common top-level directory and return it
 */
function detectTopLevelDirectory(paths) {
    if (paths.length === 0) {
        return "";
    }
    // Check if all paths start with the same directory
    const firstPath = paths[0];
    if (!firstPath) {
        return "";
    }
    const firstSlashIndex = firstPath.indexOf("/");
    if (firstSlashIndex > 0) {
        const potentialTopDir = firstPath.substring(0, firstSlashIndex + 1);
        // Check if all paths start with this directory
        if (paths.every((p) => p?.startsWith(potentialTopDir))) {
            console.log(`[ZIP Utils] Detected top-level directory in zip: ${potentialTopDir}`);
            return potentialTopDir;
        }
    }
    return "";
}
/**
 * Extract ZIP file directly to ZenFS at the specified path
 * @param zipBlob - The ZIP file blob
 * @param targetPath - Target path in ZenFS (e.g., "/skills/my-skill")
 * @param checkConflict - If true, throw error if target path already exists
 */
export async function extractZipToFS(zipBlob, targetPath, checkConflict = true) {
    // Ensure ZenFS is initialized
    await zenfs.initialize();
    // Check for conflicts if requested
    if (checkConflict) {
        const exists = await zenfs.exists(targetPath);
        if (exists) {
            const skillName = targetPath.split("/").pop() || "unknown";
            throw new SkillConflictError(skillName);
        }
    }
    // Convert blob to array buffer and unzip
    const arrayBuffer = await zipBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const unzipped = unzipSync(uint8Array);
    // Filter out unwanted files
    const filteredPaths = Object.keys(unzipped).filter((path) => !shouldFilterPath(path));
    // Detect and remove common top-level directory
    const topLevelDir = detectTopLevelDirectory(filteredPaths);
    // Create target directory
    await zenfs.mkdir(targetPath, { recursive: true });
    // Extract files
    let fileCount = 0;
    for (const path of filteredPaths) {
        const data = unzipped[path];
        if (!data) {
            continue;
        }
        // Skip directories (they have no data or end with /)
        if (data.length === 0 && path.endsWith("/")) {
            continue;
        }
        // Remove top-level directory from path if it exists
        const relativePath = topLevelDir
            ? path.substring(topLevelDir.length)
            : path;
        // Skip if the path is empty (was just the top-level dir)
        if (!relativePath) {
            continue;
        }
        // Construct full path in ZenFS
        const fullPath = `${targetPath}/${relativePath}`;
        // Create parent directories if needed
        const parentDir = fullPath.substring(0, fullPath.lastIndexOf("/"));
        if (parentDir && parentDir !== targetPath) {
            await zenfs.mkdir(parentDir, { recursive: true });
        }
        // Determine if file is text or binary
        const isText = /\.(md|txt|js|ts|json|css|html|xml|yaml|yml)$/i.test(relativePath);
        // Write file to ZenFS
        if (isText) {
            const content = strFromU8(data);
            await zenfs.writeFile(fullPath, content);
        }
        else {
            await zenfs.writeFile(fullPath, data);
        }
        fileCount++;
    }
    console.log(`[ZIP Utils] Extracted ${fileCount} files to ${targetPath}`);
}
/**
 * Get list of script files in a skill directory
 */
export async function getSkillScripts(skillPath) {
    const scriptsPath = `${skillPath}/scripts`;
    try {
        const exists = await zenfs.exists(scriptsPath);
        if (!exists) {
            return [];
        }
        const files = await zenfs.readdir(scriptsPath);
        return files
            .filter((f) => f.endsWith(".js") || f.endsWith(".ts"))
            .map((f) => `scripts/${f}`);
    }
    catch (error) {
        console.warn(`[ZIP Utils] Failed to read scripts directory: ${error}`);
        return [];
    }
}
/**
 * Get list of reference files in a skill directory
 */
export async function getSkillReferences(skillPath) {
    const referencesPath = `${skillPath}/references`;
    try {
        const exists = await zenfs.exists(referencesPath);
        if (!exists) {
            return [];
        }
        const files = await zenfs.readdir(referencesPath);
        return files
            .filter((f) => f.endsWith(".md") || f.endsWith(".txt"))
            .map((f) => `references/${f}`);
    }
    catch (error) {
        console.warn(`[ZIP Utils] Failed to read references directory: ${error}`);
        return [];
    }
}
/**
 * Get list of asset files in a skill directory
 */
export async function getSkillAssets(skillPath) {
    const assetsPath = `${skillPath}/assets`;
    try {
        const exists = await zenfs.exists(assetsPath);
        if (!exists) {
            return [];
        }
        const files = await zenfs.readdir(assetsPath);
        return files.map((f) => `assets/${f}`);
    }
    catch (error) {
        console.warn(`[ZIP Utils] Failed to read assets directory: ${error}`);
        return [];
    }
}
