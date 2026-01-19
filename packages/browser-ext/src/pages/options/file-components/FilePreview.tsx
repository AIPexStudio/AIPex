import {
  Alert,
  AlertDescription,
} from "@aipexstudio/aipex-react/components/ui/alert";
import { Badge } from "@aipexstudio/aipex-react/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@aipexstudio/aipex-react/components/ui/dialog";
import { useTheme } from "@aipexstudio/aipex-react/theme/context";
import type { FileInfo } from "@aipexstudio/browser-runtime";
import { zenfs } from "@aipexstudio/browser-runtime";
import { AlertCircle, Code, File as FileIcon, FileText } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

import { formatBytes, formatDate, getFileExtension } from "./utils";

interface FilePreviewProps {
  filePath: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  filePath,
  open,
  onOpenChange,
}) => {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { effectiveTheme } = useTheme();

  useEffect(() => {
    if (filePath && open) {
      loadFile();
    }
  }, [filePath, open, loadFile]);

  const loadFile = async () => {
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
  };

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
    if (fileInfo.isText && fileInfo.content) {
      const ext = getFileExtension(fileInfo.name);
      const language = getLanguageFromExtension(ext);
      const isDark = effectiveTheme === "dark";

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {language ? `${language} code` : "Text file"}
            </span>
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
