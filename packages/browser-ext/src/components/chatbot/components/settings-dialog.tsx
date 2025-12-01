import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "~/lib/utils";
import type { ChatSettings, SettingsDialogProps } from "~/types";
import { useComponentsContext, useConfigContext } from "../core/context";

type SettingsTab = "general" | "security";

export interface ExtendedSettingsDialogProps extends SettingsDialogProps {
  /** Available languages */
  languages?: Array<{ value: string; label: string }>;
  /** Available themes */
  themes?: Array<{ value: string; label: string }>;
}

const DEFAULT_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];

const DEFAULT_THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * Default SettingsDialog component
 */
export function DefaultSettingsDialog({
  open,
  onOpenChange,
  onSave,
  languages = DEFAULT_LANGUAGES,
  themes = DEFAULT_THEMES,
}: ExtendedSettingsDialogProps) {
  const { settings, updateSettings, isLoading } = useConfigContext();

  // Local state for editing
  const [tempSettings, setTempSettings] = useState<ChatSettings>({});
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [isSaving, setIsSaving] = useState(false);

  // Sync temp settings when dialog opens
  useEffect(() => {
    if (open) {
      setTempSettings({ ...settings });
    }
  }, [open, settings]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateSettings(tempSettings);
      onSave?.(tempSettings);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  }, [tempSettings, updateSettings, onSave, onOpenChange]);

  const updateTempSetting = <K extends keyof ChatSettings>(
    key: K,
    value: ChatSettings[K],
  ) => {
    setTempSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your AI assistant preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex border-b">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "general"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              General
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === "security"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Security
            </button>
          </div>

          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-4 py-4">
              {/* Language */}
              <div className="space-y-2">
                <label
                  htmlFor="language-select"
                  className="text-sm font-medium"
                >
                  Language
                </label>
                <Select
                  value={tempSettings.language}
                  onValueChange={(value) =>
                    updateTempSetting("language", value)
                  }
                >
                  <SelectTrigger id="language-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <label htmlFor="theme-select" className="text-sm font-medium">
                  Theme
                </label>
                <Select
                  value={tempSettings.theme}
                  onValueChange={(value) => updateTempSetting("theme", value)}
                >
                  <SelectTrigger id="theme-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {themes.map((theme) => (
                      <SelectItem key={theme.value} value={theme.value}>
                        {theme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Host */}
              <div className="space-y-2">
                <label htmlFor="ai-host-input" className="text-sm font-medium">
                  AI Host
                </label>
                <Input
                  id="ai-host-input"
                  value={tempSettings.aiHost || ""}
                  onChange={(e) => updateTempSetting("aiHost", e.target.value)}
                  placeholder="https://api.openai.com/v1/chat/completions"
                />
              </div>

              {/* AI Token */}
              <div className="space-y-2">
                <label htmlFor="ai-token-input" className="text-sm font-medium">
                  AI Token
                </label>
                <Input
                  id="ai-token-input"
                  type="password"
                  value={tempSettings.aiToken || ""}
                  onChange={(e) => updateTempSetting("aiToken", e.target.value)}
                  placeholder="sk-..."
                />
              </div>

              {/* AI Model */}
              <div className="space-y-2">
                <label htmlFor="ai-model-input" className="text-sm font-medium">
                  AI Model
                </label>
                <Input
                  id="ai-model-input"
                  value={tempSettings.aiModel || ""}
                  onChange={(e) => updateTempSetting("aiModel", e.target.value)}
                  placeholder="gpt-4"
                />
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground">
                Security settings can be customized by providing a custom
                SettingsDialog component.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * SettingsDialog - Renders either custom or default settings dialog
 */
export function SettingsDialog(props: ExtendedSettingsDialogProps) {
  const { components } = useComponentsContext();

  const CustomComponent = components.SettingsDialog;
  if (CustomComponent) {
    return <CustomComponent {...props} />;
  }

  return <DefaultSettingsDialog {...props} />;
}
