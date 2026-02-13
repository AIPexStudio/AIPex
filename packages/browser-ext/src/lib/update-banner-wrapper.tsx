/**
 * UpdateBannerWrapper
 * Connects the platform-agnostic UpdateBanner component to Chrome extension
 * version-checking services.
 */

import { useCallback } from "react";
import { UpdateBanner } from "@aipexstudio/aipex-react/components/chatbot";
import {
  checkVersion,
  dismissUpdate,
  isUpdateDismissed,
  openChangelog,
  openUpdatePage,
  requestUpdate,
} from "../services/version-checker";

export function UpdateBannerWrapper() {
  const handleCheckVersion = useCallback(() => checkVersion(), []);
  const handleIsUpdateDismissed = useCallback(
    (version: string) => isUpdateDismissed(version),
    [],
  );
  const handleDismissUpdate = useCallback(
    (version: string) => dismissUpdate(version),
    [],
  );
  const handleRequestUpdate = useCallback(() => requestUpdate(), []);
  const handleOpenChangelog = useCallback(
    (url: string) => openChangelog(url),
    [],
  );
  const handleOpenUpdatePage = useCallback(() => openUpdatePage(), []);

  return (
    <UpdateBanner
      onCheckVersion={handleCheckVersion}
      onIsUpdateDismissed={handleIsUpdateDismissed}
      onDismissUpdate={handleDismissUpdate}
      onRequestUpdate={handleRequestUpdate}
      onOpenChangelog={handleOpenChangelog}
      onOpenUpdatePage={handleOpenUpdatePage}
    />
  );
}
