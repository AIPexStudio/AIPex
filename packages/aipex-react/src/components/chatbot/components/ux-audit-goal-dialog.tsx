import { ScanSearchIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../../../i18n/context";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";

type UxAuditPlatform = "desktop" | "mobile" | "web";

export interface UxAuditFormData {
  targetLink: string;
  platform: UxAuditPlatform;
  jtbd: string;
  targetUsers: string;
}

interface UxAuditFormErrors {
  targetLink?: string;
  jtbd?: string;
}

/**
 * URL validation: only http/https, max 2048 chars.
 */
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

interface UxAuditGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UxAuditFormData) => void;
}

export function UxAuditGoalDialog({
  open,
  onOpenChange,
  onSubmit,
}: UxAuditGoalDialogProps) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<UxAuditFormData>({
    targetLink: "",
    platform: "desktop",
    jtbd: "",
    targetUsers: "",
  });
  const [errors, setErrors] = useState<UxAuditFormErrors>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        targetLink: "",
        platform: "desktop",
        jtbd: "",
        targetUsers: "",
      });
      setErrors({});
    }
  }, [open]);

  const validateForm = useCallback((): boolean => {
    const newErrors: UxAuditFormErrors = {};

    // Validate target link (required, valid URL)
    const trimmedUrl = formData.targetLink.trim();
    if (!trimmedUrl) {
      newErrors.targetLink = t("uxAuditGoal.validation.required");
    } else if (!isValidUrl(trimmedUrl)) {
      newErrors.targetLink = t("uxAuditGoal.validation.invalidUrl");
    } else if (trimmedUrl.length > 2048) {
      newErrors.targetLink = t("uxAuditGoal.validation.invalidUrl");
    }

    // Validate JTBD (required, max 2000 chars)
    const trimmedJtbd = formData.jtbd.trim();
    if (!trimmedJtbd) {
      newErrors.jtbd = t("uxAuditGoal.validation.required");
    } else if (trimmedJtbd.length > 2000) {
      newErrors.jtbd = t("uxAuditGoal.validation.required");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  const isFormValid =
    formData.targetLink.trim().length > 0 && formData.jtbd.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (validateForm()) {
      onSubmit(formData);
      onOpenChange(false);
    }
  }, [formData, onOpenChange, onSubmit, validateForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanSearchIcon className="w-5 h-5 text-cyan-600" />
            {t("uxAuditGoal.dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("uxAuditGoal.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Target Link */}
          <div className="grid gap-2">
            <Label htmlFor="targetLink" className="flex items-center gap-1">
              {t("uxAuditGoal.fields.targetLink")}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="targetLink"
              type="url"
              placeholder={t("uxAuditGoal.fields.targetLinkPlaceholder")}
              value={formData.targetLink}
              onChange={(e) => {
                setFormData((prev) => ({
                  ...prev,
                  targetLink: e.target.value,
                }));
                if (errors.targetLink) {
                  setErrors((prev) => ({ ...prev, targetLink: undefined }));
                }
              }}
              className={errors.targetLink ? "border-red-500" : ""}
              maxLength={2048}
            />
            {errors.targetLink && (
              <p className="text-xs text-red-500">{errors.targetLink}</p>
            )}
          </div>

          {/* Platform */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-1">
              {t("uxAuditGoal.fields.platform")}
              <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("uxAuditGoal.fields.platformHint")}
            </p>
            <div className="flex gap-2">
              {(["desktop", "mobile", "web"] as const).map((platform) => (
                <Button
                  key={platform}
                  type="button"
                  variant={
                    formData.platform === platform ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setFormData((prev) => ({ ...prev, platform }))}
                >
                  {t(`uxAuditGoal.platform.${platform}`)}
                </Button>
              ))}
            </div>
          </div>

          {/* JTBD */}
          <div className="grid gap-2">
            <Label htmlFor="jtbd" className="flex items-center gap-1">
              {t("uxAuditGoal.fields.jtbd")}
              <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("uxAuditGoal.fields.jtbdHint")}
            </p>
            <Textarea
              id="jtbd"
              placeholder={t("uxAuditGoal.fields.jtbdPlaceholder")}
              value={formData.jtbd}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, jtbd: e.target.value }));
                if (errors.jtbd) {
                  setErrors((prev) => ({ ...prev, jtbd: undefined }));
                }
              }}
              className={errors.jtbd ? "border-red-500" : ""}
              rows={3}
              maxLength={2000}
            />
            {errors.jtbd && (
              <p className="text-xs text-red-500">{errors.jtbd}</p>
            )}
          </div>

          {/* Target Users (optional) */}
          <div className="grid gap-2">
            <Label htmlFor="targetUsers">
              {t("uxAuditGoal.fields.targetUsers")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("uxAuditGoal.fields.targetUsersHint")}
            </p>
            <Input
              id="targetUsers"
              placeholder={t("uxAuditGoal.fields.targetUsersPlaceholder")}
              value={formData.targetUsers}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  targetUsers: e.target.value,
                }))
              }
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("uxAuditGoal.actions.cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!isFormValid}>
            {t("uxAuditGoal.actions.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
