import { SettingsIcon } from "lucide-react";
import { useCallback } from "react";
import { useTranslation } from "../../../i18n/context";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";

export interface ConfigurationGuideProps {
  onOpenSettings?: () => void;
  className?: string;
}

export function ConfigurationGuide({
  onOpenSettings,
  className,
}: ConfigurationGuideProps) {
  const { t } = useTranslation();

  const handleOpenOptions = useCallback(() => {
    if (onOpenSettings) {
      onOpenSettings();
    } else if (
      typeof chrome !== "undefined" &&
      chrome.runtime?.openOptionsPage
    ) {
      chrome.runtime.openOptionsPage();
    }
  }, [onOpenSettings]);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-full p-4 sm:p-8",
        className,
      )}
    >
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <SettingsIcon className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t("config.title")}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {t("config.description")}
        </p>

        <p className="text-xs text-gray-500 dark:text-gray-500 mb-6">
          {t("config.apiTokenRequired")}
        </p>

        <Button
          onClick={handleOpenOptions}
          className="gap-2"
          variant="default"
          size="lg"
        >
          <SettingsIcon className="w-4 h-4" />
          {t("config.openSettings")}
        </Button>
      </div>
    </div>
  );
}
