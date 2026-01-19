# ZenFS File Manager

A visual file management system for browsing and managing files in the ZenFS virtual file system.

## Features

### 📁 File Browsing
- **Tree View**: Hierarchical display of all skills and files
- **Expandable Folders**: Click to expand/collapse directories
- **File Icons**: Visual indicators based on file type (📝, 🖼️, 📜, etc.)
- **File Metadata**: View file size, modification time, and type

### 🔍 Search & Filter
- **Real-time Search**: Filter files and folders by name
- **Search Highlighting**: Matches are highlighted in the tree

### 📊 Disk Usage Statistics
- **Overall Usage**: Total size, file count, and directory count
- **Per-Skill Breakdown**: Detailed usage for each skill
- **Visual Indicators**: Easy-to-read badges and statistics

### 👁️ File Preview
- **Text Files**: Syntax-highlighted preview for code files
- **Supported Languages**: JavaScript, TypeScript, JSON, HTML, CSS, Python, etc.
- **File Information**: Path, size, modification date

### 🗑️ File Management
- **Delete Files**: Remove individual files with confirmation
- **Delete Directories**: Recursively delete folders and contents
- **Protected Paths**: Built-in protection for system-critical files
- **Confirmation Dialogs**: Prevent accidental deletions

### 🔒 Safety Features
- **Protected Paths**: Cannot delete `/skills` root or built-in skills
- **Delete Confirmation**: Mandatory confirmation for all deletions
- **Directory Warnings**: Special warning for recursive folder deletion

## Usage

### Accessing the File Manager

1. Open the AIPex extension options page
2. Navigate to the **Skills** tab
3. Click on the **File System** sub-tab
4. The file manager will initialize and display your ZenFS contents

### Browsing Files

- Click on folder icons to expand/collapse directories
- Hover over files to see action buttons
- Use the search bar to filter files by name

### Viewing File Details

1. Click on a file in the tree
2. Or click the "View" button in the file actions menu
3. The preview dialog will show file contents and metadata

### Deleting Files

1. Hover over a file or folder
2. Click the "..." menu button
3. Select "Delete"
4. Confirm the deletion in the dialog

**Note**: Protected system files cannot be deleted

### Viewing Disk Usage

- Overall statistics are shown at the top of the file manager
- Per-skill usage is displayed in a separate card
- All sizes are shown in human-readable format (KB, MB, etc.)

## Technical Details

### Components

- **FileExplorer**: Main container component
- **FileTree**: Recursive tree rendering
- **FileItem**: Individual file/folder items
- **FileActions**: Dropdown menu for file operations
- **FilePreview**: Modal for viewing file contents
- **DeleteConfirmDialog**: Confirmation dialog for deletions

### API Extensions

The file manager extends the ZenFS Manager with new methods:

- `getFileTree()`: Get hierarchical file structure
- `getFileInfo()`: Get detailed file information
- `getDiskUsage()`: Calculate disk usage statistics
- `rename()`: Rename files and directories
- `copy()`: Copy files and directories

### Protected Paths

The following paths are protected from deletion:
- `/skills` (root directory)
- `/skills/skill-creator` (built-in skill)

## File Type Support

### Text Files (with preview)
- `.js`, `.ts`, `.tsx`, `.jsx` - JavaScript/TypeScript
- `.json` - JSON
- `.html`, `.css`, `.scss` - Web files
- `.md`, `.txt` - Documentation
- `.py`, `.java`, `.go`, `.rs` - Various programming languages

### Binary Files
- Displayed with file info but no preview

## Future Enhancements

- [ ] File upload functionality
- [ ] Drag-and-drop file management
- [ ] Bulk operations (multi-select)
- [ ] File rename capability
- [ ] File copy/move operations
- [ ] Export files to local filesystem
- [ ] Search within file contents
- [ ] File sorting options
