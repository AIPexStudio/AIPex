/**
 * BrowserContextLoader
 * Rendered inside PromptInput (via the promptExtras slot) to populate
 * available contexts (tabs, bookmarks, current page) and available skills.
 *
 * This component renders nothing visible; it only syncs data from
 * browser-runtime providers into the PromptInput context hooks.
 */

import {
  type SkillItem,
  usePromptInputContexts,
  usePromptInputSkills,
} from "@aipexstudio/aipex-react/components/ai-elements/prompt-input";
import type { SkillMetadata } from "@aipexstudio/browser-runtime";
import { skillManager, skillStorage } from "@aipexstudio/browser-runtime";
import { useEffect } from "react";
import { useTabsSync } from "../hooks/use-tabs-sync";

export function BrowserContextLoader() {
  const contexts = usePromptInputContexts();
  const skills = usePromptInputSkills();

  // Sync contexts from tab/bookmark/page providers
  useTabsSync({
    onContextsUpdate: (availableContexts) => {
      contexts.setAvailableContexts(availableContexts);
    },
    onContextRemove: (contextId) => {
      contexts.remove(contextId);
    },
    getSelectedContexts: () => {
      return contexts.items;
    },
    debounceDelay: 300,
  });

  // Load skills and subscribe to skill changes
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const allSkills: SkillMetadata[] = await skillStorage.listSkills();
        const enabledSkills = allSkills.filter(
          (skill: SkillMetadata) => skill.enabled,
        );
        const skillItems: SkillItem[] = enabledSkills.map(
          (skill: SkillMetadata) => ({
            id: skill.id,
            name: skill.name,
            description: skill.description,
          }),
        );
        skills.setAvailableSkills(skillItems);
      } catch (error) {
        console.error("[BrowserContextLoader] Failed to load skills:", error);
      }
    };

    // Initial load
    void loadSkills();

    // Subscribe to skill changes
    const unsubscribeLoaded = skillManager.subscribe(
      "skill_loaded",
      () => void loadSkills(),
    );
    const unsubscribeUnloaded = skillManager.subscribe(
      "skill_unloaded",
      () => void loadSkills(),
    );
    const unsubscribeEnabled = skillManager.subscribe(
      "skill_enabled",
      () => void loadSkills(),
    );
    const unsubscribeDisabled = skillManager.subscribe(
      "skill_disabled",
      () => void loadSkills(),
    );

    return () => {
      unsubscribeLoaded();
      unsubscribeUnloaded();
      unsubscribeEnabled();
      unsubscribeDisabled();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills]);

  return null;
}
