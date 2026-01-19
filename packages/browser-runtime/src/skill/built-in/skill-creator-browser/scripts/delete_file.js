/**
 * Delete File - Deletes a file or directory from the file system
 * Browser-compatible JavaScript version using memfs and JSZip
 *
 * Usage:
 *    main({ path: '/skills/my-skill/SKILL.md' })
 *
 * Example:
 *    main({ path: '/skills/my-skill/SKILL.md' })
 */
async function _main(args) {
  const { path } = args;

  if (!path) {
    throw new Error("path is required");
  }

  if (!fs.existsSync(path)) {
    console.log(`❌ Error: File or directory not found: ${path}`);
    return { success: false, error: `File or directory not found: ${path}` };
  }

  try {
    fs.rmSync(path, { recursive: true });
    console.log(`✅ Deleted file or directory: ${path}`);
    return { success: true };
  } catch (error) {
    console.log(`❌ Error deleting file or directory: ${error.message}`);
    return { success: false, error: error.message };
  }
}
