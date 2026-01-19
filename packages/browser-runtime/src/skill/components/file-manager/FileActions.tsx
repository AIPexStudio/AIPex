import { Download, Eye, Info, MoreVertical, Trash2 } from "lucide-react"
import React, { useState } from "react"

import { Button } from "~/../components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "~/../components/ui/dropdown-menu"
import { FileTreeNode } from "~/lib/vm/zenfs-manager"

import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
import { isProtectedPath } from "./utils"

interface FileActionsProps {
  node: FileTreeNode
  onDelete?: (path: string) => void
  onView?: (path: string) => void
}

export const FileActions: React.FC<FileActionsProps> = ({
  node,
  onDelete,
  onView
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  // const isProtected = isProtectedPath(node.path)

  const handleView = () => {
    if (onView) {
      onView(node.path)
    }
  }

  const handleDelete = () => {
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(node.path)
    }
    setDeleteDialogOpen(false)
  }

  const handleInfo = () => {
    // Show file info in console for now
    console.log("File Info:", {
      path: node.path,
      name: node.name,
      type: node.type,
      size: node.size,
      mtime: node.mtime
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* View (files only) */}
          {node.type === "file" && onView && (
            <DropdownMenuItem onClick={handleView}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
          )}

          {/* Info */}
          <DropdownMenuItem onClick={handleInfo}>
            <Info className="mr-2 h-4 w-4" />
            Properties
          </DropdownMenuItem>

          {/* Delete */}
          {
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          }

          {/* {isProtected && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete (Protected)
              </DropdownMenuItem>
            </>
          )} */}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        fileName={node.name}
        fileType={node.type}
      />
    </>
  )
}
