import React from "react";
import { Badge } from "@aipexstudio/aipex-react/components/ui/badge";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from "lucide-react";
import type { FileTreeNode } from "@aipexstudio/browser-runtime";
import { formatBytes, formatDate, getFileIcon } from "./utils";
import { FileActions } from "./FileActions";

interface FileItemProps {
  node: FileTreeNode;
  level: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect?: (path: string) => void;
  onDelete?: (path: string) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  node,
  level,
  isExpanded,
  onToggle,
  onSelect,
  onDelete,
}) => {
  const isDirectory = node.type === "directory";
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = () => {
    if (isDirectory) {
      onToggle();
    } else if (onSelect) {
      onSelect(node.path);
    }
  };

  return (
    <div className="group relative">
      <div
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-accent rounded-md cursor-pointer transition-colors"
        style={{ paddingLeft: `${level * 24 + 8}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse Icon */}
        {isDirectory && hasChildren && (
          <div className="w-4 h-4 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
        {isDirectory && !hasChildren && <div className="w-4 h-4 flex-shrink-0" />}
        {!isDirectory && <div className="w-4 h-4 flex-shrink-0" />}

        {/* File/Folder Icon */}
        <div className="flex-shrink-0">
          {isDirectory ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 text-blue-500" />
            )
          ) : (
            <span className="text-base" title={node.name}>
              {getFileIcon(node.name)}
            </span>
          )}
        </div>

        {/* File/Folder Name */}
        <span className="flex-1 text-sm truncate" title={node.name}>
          {node.name}
        </span>

        {/* File Size */}
        {!isDirectory && (
          <Badge variant="secondary" className="text-xs">
            {formatBytes(node.size)}
          </Badge>
        )}

        {/* Modified Time */}
        <span
          className="text-xs text-muted-foreground hidden md:block"
          title={node.mtime.toLocaleString()}
        >
          {formatDate(node.mtime)}
        </span>

        {/* Actions - Always rendered but hidden with CSS until hover */}
        <div
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <FileActions
            node={node}
            onDelete={onDelete}
            onView={!isDirectory ? onSelect : undefined}
          />
        </div>
      </div>
    </div>
  );
};
