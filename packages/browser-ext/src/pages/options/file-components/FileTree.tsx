import React, { useState } from "react";
import type { FileTreeNode } from "@aipexstudio/browser-runtime";
import { FileItem } from "./FileItem";

interface FileTreeProps {
  nodes: FileTreeNode[];
  level?: number;
  onFileSelect?: (path: string) => void;
  onDelete?: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  level = 0,
  onFileSelect,
  onDelete,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => {
        const isExpanded = expandedNodes.has(node.path);
        const hasChildren = node.children && node.children.length > 0;

        return (
          <div key={node.path}>
            <FileItem
              node={node}
              level={level}
              isExpanded={isExpanded}
              onToggle={() => toggleNode(node.path)}
              onSelect={onFileSelect}
              onDelete={onDelete}
            />

            {/* Render children if directory is expanded */}
            {hasChildren && isExpanded && (
              <FileTree
                nodes={node.children!}
                level={level + 1}
                onFileSelect={onFileSelect}
                onDelete={onDelete}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
