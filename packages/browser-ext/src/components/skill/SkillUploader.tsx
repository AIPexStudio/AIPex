import {
  Alert,
  AlertDescription,
} from "@aipexstudio/aipex-react/components/ui/alert";
import { Button } from "@aipexstudio/aipex-react/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@aipexstudio/aipex-react/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@aipexstudio/aipex-react/components/ui/dialog";
import { Progress } from "@aipexstudio/aipex-react/components/ui/progress";
import { AlertCircle, CheckCircle, FileArchive, Upload } from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import type { SkillClient, SkillMetadata } from "./types";

interface SkillUploaderProps {
  skillClient: SkillClient;
  onUploadSuccess: (skill: SkillMetadata) => void;
  onUploadError: (error: string) => void;
}

export const SkillUploader: React.FC<SkillUploaderProps> = ({
  skillClient,
  onUploadSuccess,
  onUploadError,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictingSkillName, setConflictingSkillName] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = useCallback(
    async (file: File, replace: boolean = false) => {
      if (!file.name.endsWith(".zip")) {
        onUploadError("Please select a valid ZIP file");
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatus("idle");

      try {
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        // Upload skill
        const result = await skillClient.uploadSkill(file, replace);

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (result.ok) {
          setUploadStatus("success");
          setStatusMessage(
            `Skill "${result.skill.name}" ${replace ? "replaced" : "uploaded"} successfully!`,
          );
          onUploadSuccess(result.skill);

          // Reset after 3 seconds
          setTimeout(() => {
            setUploadStatus("idle");
            setStatusMessage("");
            setUploadProgress(0);
          }, 3000);
        } else if (result.type === "conflict") {
          setConflictingSkillName(result.skillName);
          setPendingFile(file);
          setConflictDialogOpen(true);
        } else {
          setUploadStatus("error");
          setStatusMessage(result.message);
          onUploadError(result.message);
        }
      } catch (error) {
        setUploadStatus("error");
        const message =
          error instanceof Error ? error.message : "Upload failed";
        setStatusMessage(message);
        onUploadError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [skillClient, onUploadSuccess, onUploadError],
  );

  const handleConfirmReplace = useCallback(async () => {
    setConflictDialogOpen(false);
    if (pendingFile) {
      await handleFileSelect(pendingFile, true);
      setPendingFile(null);
    }
  }, [pendingFile, handleFileSelect]);

  const handleCancelReplace = useCallback(() => {
    setConflictDialogOpen(false);
    setPendingFile(null);
    setConflictingSkillName("");
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files?.[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect],
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Skill
        </CardTitle>
        <CardDescription>
          Upload a skill ZIP file to extend AI capabilities
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            role="button"
            tabIndex={0}
            aria-label="Upload skill ZIP file"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              title="Upload skill ZIP file"
              type="file"
              accept=".zip"
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
              ref={fileInputRef}
            />

            <div className="space-y-2">
              <FileArchive className="h-12 w-12 mx-auto text-muted-foreground" />
              <div className="text-lg font-medium">
                {isUploading ? "Uploading..." : "Drop your skill ZIP file here"}
              </div>
              <div className="text-sm text-muted-foreground">
                or click to browse files
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading skill...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Status Messages */}
          {uploadStatus !== "idle" && (
            <Alert
              variant={uploadStatus === "success" ? "default" : "destructive"}
            >
              <div className="flex items-center gap-2">
                {uploadStatus === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{statusMessage}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Help Text */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>
              • Skill files must be ZIP archives containing a SKILL.md file
            </div>
            <div>
              • Supported file types: scripts (JS), references (MD), assets
              (any)
            </div>
            <div>• Maximum file size: 10MB</div>
          </div>
        </div>
      </CardContent>

      {/* Conflict Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skill Already Exists</DialogTitle>
            <DialogDescription>
              A skill named "{conflictingSkillName}" already exists. Do you want
              to replace it with the new version?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelReplace}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReplace}>Replace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
