/**
 * Skill Packager - Creates a distributable zip file and triggers browser download
 * Browser-compatible JavaScript version using memfs and JSZip
 *
 * Usage:
 *    packageSkill(skillPath)
 *
 * Example:
 *    packageSkill('/skills/public/my-skill')
 *
 * Note: The outputDir parameter is no longer used. The function will automatically
 * trigger a browser download dialog for the generated zip file.
 */

import { zipSync } from "fflate"

/**
 * Base64 encoding function for QuickJS environment
 * Since btoa is not available in QuickJS, we need to implement it manually
 */
function base64Encode(uint8Array) {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  let i = 0
  const len = uint8Array.length

  // Process 3 bytes at a time
  while (i < len) {
    const byte1 = uint8Array[i++]
    const byte2 = i < len ? uint8Array[i++] : null
    const byte3 = i < len ? uint8Array[i++] : null

    const encoded1 = byte1 >> 2
    const encoded2 = ((byte1 & 0x03) << 4) | ((byte2 !== null ? byte2 : 0) >> 4)
    const encoded3 = byte2 !== null ? (((byte2 & 0x0f) << 2) | ((byte3 !== null ? byte3 : 0) >> 6)) : null
    const encoded4 = byte3 !== null ? (byte3 & 0x3f) : null

    result += base64Chars[encoded1]
    result += base64Chars[encoded2]
    result += encoded3 !== null ? base64Chars[encoded3] : '='
    result += encoded4 !== null ? base64Chars[encoded4] : '='
  }

  return result
}

function collectFiles(basePath) {
  const entries = fs.readdirSync(basePath)
  const files = {}

  for (const entry of entries) {
    const fullPath = basePath === "/" ? `/${entry}` : `${basePath}/${entry}`
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory) {
      Object.assign(files, collectFiles(fullPath))
    } else {
      const data = fs.readFileSync(fullPath) // 返回 Buffer

      // Convert Buffer to Uint8Array properly
      // In QuickJS, we need to manually copy bytes
      let uint8Array
      if (data instanceof Uint8Array) {
        uint8Array = data
      } else if (data && typeof data === 'object' && 'length' in data) {
        // Buffer-like object, convert to Uint8Array
        uint8Array = new Uint8Array(data.length)
        for (let i = 0; i < data.length; i++) {
          uint8Array[i] = data[i]
        }
      } else {
        console.error(`Unexpected data type for ${fullPath}:`, typeof data)
        uint8Array = new Uint8Array(0)
      }

      files[fullPath.slice(1)] = uint8Array // 去掉根目录斜杠
    }
  }

  return files
}

// Inline validateSkill function (from quick_validate.js)
function validateSkill(skillPath, fs) {
  /**Basic validation of a skill*/

  // Check SKILL.md exists
  const skillMd = `${skillPath}/SKILL.md`
  if (!fs.existsSync(skillMd)) {
    return { success: false, message: "SKILL.md not found" }
  }

  // Read and validate frontmatter
  const content = fs.readFileSync(skillMd, "utf8")
  if (!content.startsWith("---")) {
    return { success: false, message: "No YAML frontmatter found" }
  }

  // Extract frontmatter
  const match = content.match(/^---\n(.*?)\n---/s)
  if (!match) {
    return { success: false, message: "Invalid frontmatter format" }
  }

  const frontmatter = match[1]

  // Check required fields
  if (!frontmatter.includes("name:")) {
    return { success: false, message: "Missing 'name' in frontmatter" }
  }
  if (!frontmatter.includes("description:")) {
    return { success: false, message: "Missing 'description' in frontmatter" }
  }

  // Extract name for validation
  const nameMatch = frontmatter.match(/name:\s*(.+)/)
  if (nameMatch) {
    const name = nameMatch[1].trim()
    // Check naming convention (hyphen-case: lowercase with hyphens)
    if (!/^[a-z0-9-]+$/.test(name)) {
      return {
        success: false,
        message: `Name '${name}' should be hyphen-case (lowercase letters, digits, and hyphens only)`
      }
    }
    if (name.startsWith("-") || name.endsWith("-") || name.includes("--")) {
      return {
        success: false,
        message: `Name '${name}' cannot start/end with hyphen or contain consecutive hyphens`
      }
    }
  }

  // Extract and validate description
  const descMatch = frontmatter.match(/description:\s*(.+)/)
  if (descMatch) {
    const description = descMatch[1].trim()
    // Check for angle brackets
    if (description.includes("<") || description.includes(">")) {
      return {
        success: false,
        message: "Description cannot contain angle brackets (< or >)"
      }
    }
  }

  return { success: true, message: "Skill is valid!" }
}

async function packageSkill(skillPath, outputDir = null) {
  /**
   * Package a skill folder into a zip file and trigger browser download.
   *
   * Args:
   *     skillPath: Path to the skill folder
   *     outputDir: (Deprecated) No longer used - kept for backward compatibility
   *
   * Returns:
   *     Object with success status, filename, and download info
   */
  // Validate skill folder exists
  if (!fs.existsSync(skillPath)) {
    console.log(`❌ Error: Skill folder not found: ${skillPath}`)
    return null
  }

  if (!fs.statSync(skillPath).isDirectory) {
    console.log(`❌ Error: Path is not a directory: ${skillPath}`)
    return null
  }

  // Validate SKILL.md exists
  const skillMd = `${skillPath}/SKILL.md`
  if (!fs.existsSync(skillMd)) {
    console.log(`❌ Error: SKILL.md not found in ${skillPath}`)
    return null
  }

  // Run validation before packaging
  console.log("🔍 Validating skill...")
  const valid = validateSkill(skillPath, fs)
  if (!valid.success) {
    console.log(`❌ Validation failed: ${valid.message}`)
    console.log("   Please fix the validation errors before packaging.")
    return null
  }
  console.log(`✅ ${valid.message}\n`)

  // Determine output location
  const skillName = skillPath.split("/").pop()
  const zipFilename = `${skillName}.zip`

  // Collect files and strip the skillPath prefix
  const filesWithFullPath = collectFiles(skillPath)
  const files = {}

  // Remove skillPath prefix from all file paths
  // So that zip extracts directly to skill root (SKILL.md, scripts/, etc.)
  // instead of nested under skills/skillName/
  for (const [fullPath, data] of Object.entries(filesWithFullPath)) {
    // fullPath is like: "skills/my-skill/SKILL.md"
    // We want to remove "skills/my-skill/" to get "SKILL.md"
    const pathParts = fullPath.split('/')
    const skillPathParts = skillPath.split('/').filter(p => p) // Remove empty parts

    // Find where the skill path ends in the full path
    let relativePath = fullPath
    if (pathParts.length > skillPathParts.length) {
      // Remove the skill path prefix
      relativePath = pathParts.slice(skillPathParts.length).join('/')
    }

    files[relativePath] = data
  }

  // Create the zip file
  try {
    console.log(`\n🔍 Debug: Collected ${Object.keys(files).length} files`)
    console.log(`🔍 Debug: File paths in zip:`, Object.keys(files))

    // Check if files have content
    for (const [path, data] of Object.entries(files)) {
      console.log(`🔍 Debug: ${path} - length: ${data.length}, type: ${typeof data}, isUint8Array: ${data instanceof Uint8Array}`)
      if (data.length > 0) {
        console.log(`🔍 Debug: First 10 bytes:`, Array.from(data.slice(0, 10)))
      }
    }

    const zipped = zipSync(files, { level: 9 })
    console.log(`\n📦 Skill packaged successfully. Zip size: ${zipped.length} bytes`)

    console.log(`\n📦 Converting to Base64...`)

    // Convert Uint8Array to Base64 string
    // Note: Using custom base64Encode since btoa is not available in QuickJS
    const base64 = base64Encode(zipped)
    console.log(`✅ Converted to Base64 (${base64.length} characters)`)
    console.log(`🔍 Debug: First 100 chars of base64:`, base64.substring(0, 100))

    // Trigger browser download using SKILL_API with Base64 data
    const downloadResult = await downloadFile(base64, {
      filename: zipFilename,
      encoding: "base64",
      saveAs: true
    })

    if (downloadResult.success) {
      console.log(`✅ Download started: ${zipFilename}`)
      return {
        success: true,
        filename: zipFilename,
        downloadId: downloadResult.downloadId,
        message: `Download started for ${zipFilename}`
      }
    } else {
      console.log(`❌ Failed to trigger download: ${downloadResult.error}`)
      return {
        success: false,
        error: downloadResult.error,
        message: `Failed to download ${zipFilename}`
      }
    }
  } catch (e) {
    console.log(`❌ Error creating zip file: ${e.message}`)
    return {
      success: false,
      error: e.message,
      message: `Error creating zip file: ${e.message}`
    }
  }
}

async function main(args) {
  const { skillPath, outputDir } = args

  if (!skillPath) {
    throw new Error("skillPath is required")
  }

  // outputDir is now optional and deprecated
  return packageSkill(skillPath, outputDir)
}
