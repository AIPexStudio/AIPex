import type { ChatStatus } from "ai";
import { ClockIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "../../../i18n/context";
import { cn } from "../../../lib/utils";
import type { ContextItem, InputAreaProps } from "../../../types";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputContextTag,
  PromptInputContextTags,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "../../ai-elements/prompt-input";
import { DEFAULT_MODELS } from "../constants";
import { useComponentsContext, useConfigContext } from "../context";

export interface ExtendedInputAreaProps extends InputAreaProps {
  /** Available models for selection */
  models?: Array<{ name: string; value: string }>;
  /** Placeholder texts for typing animation */
  placeholderTexts?: string[];
  /** Message queue count */
  queueCount?: number;
}

/**
 * Default InputArea component
 */
export function DefaultInputArea({
  value,
  onChange,
  onSubmit,
  onStop,
  status,
  placeholder,
  disabled = false,
  models = DEFAULT_MODELS,
  placeholderTexts,
  queueCount = 0,
  className,
  ...props
}: ExtendedInputAreaProps) {
  const { t } = useTranslation();
  const { slots } = useComponentsContext();
  const { settings, updateSetting } = useConfigContext();

  const effectivePlaceholder = placeholder ?? t("input.placeholder1");

  // Compute effective models list, including custom model if byokEnabled
  const effectiveModels = useMemo(() => {
    const currentModel = settings.aiModel;
    const isCustomEnabled = settings.byokEnabled;

    if (!isCustomEnabled || !currentModel) {
      return models;
    }

    // When BYOK is enabled, always show custom model with "(Custom)" tag at the top
    return [
      {
        name: `${currentModel} (Custom)`,
        value: currentModel,
      },
      ...models.filter((model) => model.value !== currentModel),
    ];
  }, [models, settings.aiModel, settings.byokEnabled]);

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);
      const hasContexts = Boolean(message.contexts?.length);

      if (!(hasText || hasAttachments || hasContexts)) {
        return;
      }

      // Convert files to File objects if needed
      const files = message.files?.map((f) => {
        // Files from PromptInput are already processed
        return f as unknown as File;
      });

      onSubmit(
        message.text || "",
        files,
        message.contexts as ContextItem[] | undefined,
      );
    },
    [onSubmit],
  );

  const handleModelChange = useCallback(
    async (newModel: string) => {
      if (newModel?.trim()) {
        await updateSetting("aiModel", newModel);
      }
    },
    [updateSetting],
  );

  // Map status to ChatStatus type
  const submitStatus: ChatStatus | undefined =
    status === "idle" ? undefined : (status as ChatStatus);

  return (
    <div className={cn("border-t p-4", className)} {...props}>
      <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
        <PromptInputBody>
          {/* Context Tags */}
          <PromptInputContextTags>
            {(context) => <PromptInputContextTag data={context} />}
          </PromptInputContextTags>

          {/* Attachments */}
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>

          {/* Textarea */}
          <PromptInputTextarea
            placeholder={effectivePlaceholder}
            enableTypingAnimation={Boolean(placeholderTexts?.length)}
            placeholderTexts={placeholderTexts}
            onChange={(e) => onChange(e.target.value)}
            value={value}
            disabled={disabled}
          />

          {/* Queue indicator */}
          {queueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md mt-2">
              <ClockIcon className="size-4" />
              <span>
                {queueCount} message{queueCount > 1 ? "s" : ""} queued
              </span>
            </div>
          )}
        </PromptInputBody>

        <PromptInputToolbar>
          <PromptInputTools>
            {/* Action Menu */}
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>

            {/* Model Selector */}
            {slots.modelSelector ? (
              slots.modelSelector({
                value: settings.aiModel,
                onChange: handleModelChange,
                models: effectiveModels,
              })
            ) : (
              <PromptInputModelSelect
                onValueChange={handleModelChange}
                value={settings.aiModel}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {effectiveModels.map((model) => (
                    <PromptInputModelSelectItem
                      key={model.value}
                      value={model.value}
                    >
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            )}
          </PromptInputTools>

          {/* Submit/Stop Button */}
          {slots.inputToolbar ? (
            slots.inputToolbar({
              status,
              onStop,
              onSubmit: () => {
                /* handled by form */
              },
            })
          ) : (
            <PromptInputSubmit
              disabled={!value && !submitStatus}
              status={submitStatus}
              onClick={status === "streaming" ? onStop : undefined}
            />
          )}
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
}

/**
 * InputArea - Renders either custom or default input area
 */
export function InputArea(props: ExtendedInputAreaProps) {
  const { components } = useComponentsContext();

  const CustomComponent = components.InputArea;
  if (CustomComponent) {
    return <CustomComponent {...props} />;
  }

  return <DefaultInputArea {...props} />;
}
