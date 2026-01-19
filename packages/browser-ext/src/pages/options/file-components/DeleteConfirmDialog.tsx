import { Button } from "@aipexstudio/aipex-react/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@aipexstudio/aipex-react/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import type React from "react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  fileName: string;
  fileType: "file" | "directory";
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  fileName,
  fileType,
}) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirm Delete
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{fileName}</span>?
            </p>
            {fileType === "directory" && (
              <p className="text-destructive">
                This will permanently delete the folder and all its contents.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
