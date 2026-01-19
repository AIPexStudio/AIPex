/**
 * Quick validation script for skills - minimal version
 * Browser-compatible JavaScript version using memfs
 */

function validateSkill(skillPath, fs) {
  /**Basic validation of a skill*/

  // Check SKILL.md exists
  const skillMd = `${skillPath}/SKILL.md`;
  if (!fs.existsSync(skillMd)) {
    return { success: false, message: "SKILL.md not found" };
  }

  // Read and validate frontmatter
  const content = fs.readFileSync(skillMd, "utf8");
  if (!content.startsWith("---")) {
    return { success: false, message: "No YAML frontmatter found" };
  }

  // Extract frontmatter
  const match = content.match(/^---\n(.*?)\n---/s);
  if (!match) {
    return { success: false, message: "Invalid frontmatter format" };
  }

  const frontmatter = match[1];

  // Check required fields
  if (!frontmatter.includes("name:")) {
    return { success: false, message: "Missing 'name' in frontmatter" };
  }
  if (!frontmatter.includes("description:")) {
    return { success: false, message: "Missing 'description' in frontmatter" };
  }

  // Extract name for validation
  const nameMatch = frontmatter.match(/name:\s*(.+)/);
  if (nameMatch) {
    const name = nameMatch[1].trim();
    // Check naming convention (hyphen-case: lowercase with hyphens)
    if (!/^[a-z0-9-]+$/.test(name)) {
      return {
        success: false,
        message: `Name '${name}' should be hyphen-case (lowercase letters, digits, and hyphens only)`,
      };
    }
    if (name.startsWith("-") || name.endsWith("-") || name.includes("--")) {
      return {
        success: false,
        message: `Name '${name}' cannot start/end with hyphen or contain consecutive hyphens`,
      };
    }
  }

  // Extract and validate description
  const descMatch = frontmatter.match(/description:\s*(.+)/);
  if (descMatch) {
    const description = descMatch[1].trim();
    // Check for angle brackets
    if (description.includes("<") || description.includes(">")) {
      return {
        success: false,
        message: "Description cannot contain angle brackets (< or >)",
      };
    }
  }

  return { success: true, message: "Skill is valid!" };
}

// Browser-compatible module export
// Main entry point for script execution
async function _main(args) {
  const { skillPath } = args;

  return validateSkill(skillPath, fs);
}
