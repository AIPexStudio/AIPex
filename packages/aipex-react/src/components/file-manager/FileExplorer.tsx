/**
 * FileExplorer Component
 * 
 * A simplified file explorer for browsing the virtual file system.
 * For a full implementation, see browser-runtime/src/skill/components/file-manager/
 */

import { FolderOpen, HardDrive } from "lucide-react";
import type React from "react";
import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import type { FileSystemClient } from "./types";

interface FileExplorerProps {
  fileSystemClient: FileSystemClient;
  basePath?: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  fileSystemClient,
  basePath = "/skills",
}) => {
  const [loading] = useState(false);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          File Manager
        </CardTitle>
        <CardDescription>
          Browse and manage files in the virtual file system
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">Loading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">File Browser</h3>
            <p className="text-muted-foreground">
              File browser UI will be available in a future update
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
