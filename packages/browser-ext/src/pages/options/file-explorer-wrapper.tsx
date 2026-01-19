/**
 * FileExplorer Wrapper
 *
 * Wraps the full FileExplorer implementation from aipex with proper imports for new-aipex.
 * This component uses the zenfs manager from @aipexstudio/browser-runtime.
 */

import {
  Alert,
  AlertDescription,
} from "@aipexstudio/aipex-react/components/ui/alert";
import { Badge } from "@aipexstudio/aipex-react/components/ui/badge";
import { Button } from "@aipexstudio/aipex-react/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@aipexstudio/aipex-react/components/ui/card";
import { Input } from "@aipexstudio/aipex-react/components/ui/input";
import type { DiskUsage, FileTreeNode } from "@aipexstudio/browser-runtime";
import { zenfs } from "@aipexstudio/browser-runtime";
import {
  AlertCircle,
  Files,
  FolderOpen,
  HardDrive,
  RefreshCw,
  Search,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

import { FilePreview } from "./file-components/FilePreview.js";
import { FileTree } from "./file-components/FileTree.js";
import { formatBytes } from "./file-components/utils.js";

interface FileExplorerProps {
  basePath?: string;
}

export const FileExplorerWrapper: React.FC<FileExplorerProps> = ({
  basePath = "/skills",
}) => {
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [diskUsage, setDiskUsage] = useState<DiskUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadFileSystem = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize ZenFS if needed
      await zenfs.initialize();

      // Load file tree and disk usage
      const [tree, usage] = await Promise.all([
        zenfs.getFileTree(basePath),
        zenfs.getDiskUsage(basePath),
      ]);

      setFileTree(tree);
      setDiskUsage(usage);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to load file system";
      setError(errorMsg);
      console.error("Failed to load file system:", err);
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    void loadFileSystem();
  }, [loadFileSystem]);

  const handleRefresh = () => {
    void loadFileSystem();
  };

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
    setPreviewOpen(true);
  };

  const handleDelete = async (path: string) => {
    try {
      await zenfs.rm(path, { recursive: true });
      await loadFileSystem();

      // Close preview if the deleted file was selected
      if (selectedFile === path) {
        setPreviewOpen(false);
        setSelectedFile(null);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to delete file";
      setError(errorMsg);
    }
  };

  const filterTree = (nodes: FileTreeNode[], query: string): FileTreeNode[] => {
    if (!query.trim()) return nodes;

    const lowerQuery = query.toLowerCase();

    return nodes
      .filter((node) => {
        // Check if current node matches
        const nameMatches = node.name.toLowerCase().includes(lowerQuery);

        // Check if any children match (for directories)
        if (node.children) {
          const filteredChildren = filterTree(node.children, query);
          if (filteredChildren.length > 0) {
            return true;
          }
        }

        return nameMatches;
      })
      .map((node) => {
        // If node has children, filter them recursively
        if (node.children) {
          return {
            ...node,
            children: filterTree(node.children, query),
          };
        }
        return node;
      });
  };

  const filteredTree = filterTree(fileTree, searchQuery);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading file system...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Disk Usage Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                File Manager
              </CardTitle>
              <CardDescription>
                Browse and manage files in the virtual file system
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {diskUsage && (
                <>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Files className="h-3 w-3" />
                    {diskUsage.fileCount} files
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <FolderOpen className="h-3 w-3" />
                    {diskUsage.directoryCount} folders
                  </Badge>
                  <Badge variant="default" className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {formatBytes(diskUsage.totalSize)}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Per-Skill Disk Usage */}
      {diskUsage && Object.keys(diskUsage.bySkill).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Disk Usage by Skill</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(diskUsage.bySkill)
                .sort((a, b) => b[1].size - a[1].size)
                .map(([skillName, usage]) => (
                  <div
                    key={skillName}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{skillName}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{usage.fileCount} files</span>
                      <Badge variant="secondary">
                        {formatBytes(usage.size)}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">File Browser</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No files found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "The file system is empty"}
              </p>
            </div>
          ) : (
            <FileTree
              nodes={filteredTree}
              onFileSelect={handleFileSelect}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* File Preview Modal */}
      <FilePreview
        filePath={selectedFile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
};
