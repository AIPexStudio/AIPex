import {
  Alert,
  AlertDescription,
} from "@aipexstudio/aipex-react/components/ui/alert";
import { Badge } from "@aipexstudio/aipex-react/components/ui/badge";
import { Button } from "@aipexstudio/aipex-react/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@aipexstudio/aipex-react/components/ui/dialog";
import { Textarea } from "@aipexstudio/aipex-react/components/ui/textarea";
import { useTheme } from "@aipexstudio/aipex-react/theme/context";
import type { FileInfo } from "@aipexstudio/browser-runtime";
import { skillManager, zenfs } from "@aipexstudio/browser-runtime";
import {
  AlertCircle,
  Code,
  Edit,
  File as FileIcon,
  FileText,
  Loader2,
  Save,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

import { formatBytes, formatDate, getFileExtension } from "./utils";

// Max file size for editing (1MB)
const MAX_EDIT_SIZE = 1024 * 1024;

/**
 * Validate that a file path is safe to write to.
 * - Must start with /skills/
 * - Must not contain path traversal segments (..)
 */
function validateFilePath(path: string): { valid: boolean; error?: string } {
  if (!path.startsWith("/skills/")) {
    return { valid: false, error: "File path must be under /skills/" };
  }
  const decodedPath = decodeURIComponent(path);
  if (decodedPath.includes("..")) {
    return { valid: false, error: "Path traversal (..) is not allowed" };
  }
  return { valid: true };
}

/**
 * Extract skill ID from a file path like /skills/<skillId>/...
 */
function extractSkillIdFromPath(path: string): string | null {
  const match = path.match(/^\/skills\/([^/]+)/);
  return match ? (match[1] ?? null) : null;
}

/**
 * Check if path is a SKILL.md file
 */
function isSkillMdPath(path: string): boolean {
  return /^\/skills\/[^/]+\/SKILL\.md$/.test(path);
}

interface FilePreviewProps {
  filePath: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSaved?: () => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  filePath,
  open,
  onOpenChange,
  onFileSaved,
}) => {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { effectiveTheme } = useTheme();

  const loadFile = useCallback(async () => {
    if (!filePath) return;

    try {
      setLoading(true);
      setError(null);

      const info = await zenfs.getFileInfo(filePath);
      setFileInfo(info);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load file";
      setError(errorMsg);
      console.error("Failed to load file:", err);
    } finally {
      setLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    if (filePath && open) {
      void loadFile();
    }
  }, [filePath, open, loadFile]);

  // Reset edit state when dialog closes or file changes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setEditedContent("");
      setSaveError(null);
    }
  }, [open]);

  const handleStartEdit = () => {
    if (fileInfo?.content) {
      setEditedContent(fileInfo.content);
      setIsEditing(true);
      setSaveError(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent("");
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!filePath || !fileInfo) return;

    // Validate path
    const pathValidation = validateFilePath(filePath);
    if (!pathValidation.valid) {
      setSaveError(pathValidation.error || "Invalid file path");
      return;
    }

    // Check size limit
    const contentSize = new Blob([editedContent]).size;
    if (contentSize > MAX_EDIT_SIZE) {
      setSaveError(
        `File content exceeds maximum size of ${formatBytes(MAX_EDIT_SIZE)}`,
      );
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      // If this is a SKILL.md file, validate the name field hasn't changed
      if (isSkillMdPath(filePath)) {
        const skillId = extractSkillIdFromPath(filePath);
        if (skillId) {
          const nameMatch = editedContent.match(
            /^---\n[\s\S]*?name:\s*(.+?)[\s]*\n[\s\S]*?---/m,
          );
          const parsedName = nameMatch?.[1]?.trim();

          if (parsedName && parsedName !== skillId) {
            setSaveError(
              `Cannot rename skill. The name "${parsedName}" in SKILL.md must match the skill ID "${skillId}". Skill renaming is not supported.`,
            );
            return;
          }
        }
      }

      // Write file to ZenFS
      await zenfs.writeFile(filePath, editedContent);

      // If this is a SKILL.md file, sync the metadata
      if (isSkillMdPath(filePath)) {
        const skillId = extractSkillIdFromPath(filePath);
        if (skillId) {
          try {
            await skillManager.refreshSkillMetadata(skillId);
          } catch (metadataErr) {
            // Log but don't fail - file was saved successfully
            console.error("Failed to sync skill metadata:", metadataErr);
          }
        }
      }

      // Reload file info to show updated content/mtime
      await loadFile();

      // Exit edit mode
      setIsEditing(false);
      setEditedContent("");

      // Notify parent that file was saved
      onFileSaved?.();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to save file";
      setSaveError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Check if file can be edited
  const canEdit =
    fileInfo?.isText &&
    fileInfo?.type === "file" &&
    fileInfo?.content !== undefined &&
    filePath?.startsWith("/skills/");

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!fileInfo) {
      return null;
    }

    // Directory
    if (fileInfo.type === "directory") {
      return (
        <Alert>
          <FileIcon className="h-4 w-4" />
          <AlertDescription>
            This is a directory. Use the file browser to view its contents.
          </AlertDescription>
        </Alert>
      );
    }

    // Text file
    if (fileInfo.isText && fileInfo.content !== undefined) {
      const ext = getFileExtension(fileInfo.name);
      const language = getLanguageFromExtension(ext);
      const isDark = effectiveTheme === "dark";

      // Edit mode
      if (isEditing) {
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Editing {language ? `${language} file` : "text file"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            </div>

            {saveError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}

            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="font-mono text-sm min-h-[400px] resize-y"
              placeholder="File content..."
              disabled={saving}
            />
          </div>
        );
      }

      // View mode
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {language ? `${language} code` : "Text file"}
              </span>
            </div>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
          <div className="relative border rounded-md overflow-hidden">
            {/* Language label */}
            <div className="absolute top-0 right-0 px-3 py-1 text-xs font-mono bg-background/80 backdrop-blur-sm border-l border-b rounded-bl-md z-10">
              {language}
            </div>

            <SyntaxHighlighter
              style={isDark ? oneDark : oneLight}
              language={language}
              PreTag="div"
              codeTagProps={{
                style: {
                  maxWidth: "100ch",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  wordBreak: "break-word",
                },
              }}
              customStyle={{
                margin: 0,
                padding: "1rem",
                paddingTop: "2.5rem",
                maxWidth: "100%",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                overflowWrap: "break-word",
                backgroundColor: "transparent",
                fontSize: "0.875rem",
                lineHeight: "1.6",
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                borderRadius: "0",
                wordBreak: "break-word",
              }}
              showLineNumbers={true}
              wrapLines={true}
              wrapLongLines={true}
            >
              {String(fileInfo.content).replace(/\n$/, "")}
            </SyntaxHighlighter>
          </div>
        </div>
      );
    }

    // Binary file
    return (
      <Alert>
        <FileIcon className="h-4 w-4" />
        <AlertDescription>
          Binary file preview is not available. File size:{" "}
          {formatBytes(fileInfo.size)}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {fileInfo?.name || "File Preview"}
          </DialogTitle>
          <DialogDescription>
            {fileInfo && (
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline">{fileInfo.type}</Badge>
                <Badge variant="outline">{formatBytes(fileInfo.size)}</Badge>
                <Badge variant="outline">
                  Modified: {formatDate(fileInfo.mtime)}
                </Badge>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">{renderContent()}</div>

        {fileInfo && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                <span className="font-semibold">Path:</span> {fileInfo.path}
              </div>
              <div>
                <span className="font-semibold">Size:</span>{" "}
                {formatBytes(fileInfo.size)}
              </div>
              <div>
                <span className="font-semibold">Modified:</span>{" "}
                {fileInfo.mtime.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/**
 * Map file extension to syntax highlighting language
 */
function getLanguageFromExtension(ext: string): string {
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
    py: "python",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    go: "go",
    rs: "rust",
    php: "php",
    rb: "ruby",
    sh: "bash",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sql: "sql",
  };

  return languageMap[ext] || "plaintext";
}
