/**
 * Selection Card
 *
 * Clean and colorful user selection card
 */

import { CheckIcon } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "../../i18n/hooks.js";
import type { TranslationKey } from "../../i18n/types.js";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import type { InterventionStatus } from "./InterventionCard.js";
import { InterventionCard } from "./InterventionCard.js";

export interface SelectionOption {
  id: string;
  label: string;
  description?: string;
}

export interface UserSelectionResult {
  selectedOptions: SelectionOption[];
  otherText?: string;
}

interface SelectionCardProps {
  status: InterventionStatus;
  question?: string;
  options?: SelectionOption[];
  mode?: "single" | "multiple";
  allowOther?: boolean;
  reason?: string;
  timeout?: number;
  selectedResult?: UserSelectionResult;
  onConfirm?: (result: UserSelectionResult) => void;
  onCancel?: () => void;
}

export const SelectionCard: React.FC<SelectionCardProps> = ({
  status,
  question,
  options = [],
  mode = "single",
  allowOther = false,
  reason,
  timeout,
  selectedResult,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [otherSelected, setOtherSelected] = useState(false);
  const [otherText, setOtherText] = useState("");

  // Normalize options: convert string array to object array
  const normalizedOptions = useMemo(() => {
    return options.map((opt: unknown, index: number) => {
      if (typeof opt === "string") {
        return {
          id: `option-${index}`,
          label: opt,
        };
      }
      if (opt && typeof opt === "object" && ("label" in opt || "id" in opt)) {
        const optObj = opt as {
          id?: string;
          label?: string;
          description?: string;
        };
        return {
          id: optObj.id || `option-${index}`,
          label:
            optObj.label ||
            optObj.id ||
            `${t("interventions.selection.promptSingle" as TranslationKey)} ${index + 1}`,
          description: optObj.description,
        };
      }
      return {
        id: `option-${index}`,
        label: String(opt),
      };
    });
  }, [options, t]);

  const isActive = status === "active" || status === "pending";
  const isCompleted = status === "completed";

  // Handle option click
  const handleOptionClick = (optionId: string) => {
    if (!isActive) return;

    if (mode === "single") {
      setSelectedIds(new Set([optionId]));
      setOtherSelected(false);
    } else {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(optionId)) {
        newSelected.delete(optionId);
      } else {
        newSelected.add(optionId);
      }
      setSelectedIds(newSelected);
    }
  };

  // Handle "other" option click
  const handleOtherClick = () => {
    if (!isActive) return;

    if (mode === "single") {
      setSelectedIds(new Set());
      setOtherSelected(true);
    } else {
      setOtherSelected(!otherSelected);
    }
  };

  // Check if can confirm
  const canConfirm =
    selectedIds.size > 0 || (otherSelected && otherText.trim().length > 0);

  // Handle confirm
  const handleConfirm = () => {
    if (!canConfirm || !onConfirm) return;

    const selectedOptions = normalizedOptions.filter((opt) => {
      return selectedIds.has(opt.id);
    });

    const result: UserSelectionResult = {
      selectedOptions,
      otherText: otherSelected ? otherText.trim() : undefined,
    };

    onConfirm(result);
  };

  // Render option
  const renderOption = (option: SelectionOption, _index: number) => {
    const optionId = option.id;
    const optionLabel = option.label;
    const isSelected = selectedIds.has(optionId);

    return (
      <button
        key={optionId}
        type="button"
        onClick={() => handleOptionClick(optionId)}
        disabled={!isActive}
        className={`
          w-full text-left p-4 rounded-xl transition-all duration-200
          ${
            isSelected
              ? "bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-400"
              : "bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-blue-300 dark:hover:ring-blue-700"
          }
          ${!isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-sm"}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Radio/Checkbox indicator */}
          <div className="flex-shrink-0 mt-0.5">
            {mode === "single" ? (
              <div
                className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                ${
                  isSelected
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 dark:border-gray-600"
                }
              `}
              >
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            ) : (
              <div
                className={`
                w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                ${
                  isSelected
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 dark:border-gray-600"
                }
              `}
              >
                {isSelected && (
                  <CheckIcon
                    className="w-3.5 h-3.5 text-white"
                    strokeWidth={3}
                  />
                )}
              </div>
            )}
          </div>

          {/* Option content */}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {optionLabel}
            </div>
            {option.description && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                {option.description}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <InterventionCard
      status={status}
      title={t("interventions.selection.title" as TranslationKey)}
      reason={reason}
      timeout={timeout}
      onCancel={onCancel}
    >
      {isActive && (
        <div className="space-y-4">
          {/* Question */}
          {question && (
            <div className="text-base font-medium text-gray-900 dark:text-gray-100 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800">
              {question}
            </div>
          )}

          {/* Option list */}
          <div className="space-y-2.5">
            {normalizedOptions.map((option, index) =>
              renderOption(option, index),
            )}

            {/* "Other" option */}
            {allowOther && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleOtherClick}
                  disabled={!isActive}
                  className={`
                    w-full text-left p-4 rounded-xl transition-all duration-200
                    ${
                      otherSelected
                        ? "bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-400"
                        : "bg-white dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-purple-300 dark:hover:ring-purple-700"
                    }
                    ${!isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-sm"}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {mode === "single" ? (
                        <div
                          className={`
                          w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                          ${
                            otherSelected
                              ? "border-purple-500 bg-purple-500"
                              : "border-gray-300 dark:border-gray-600"
                          }
                        `}
                        >
                          {otherSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      ) : (
                        <div
                          className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                          ${
                            otherSelected
                              ? "border-purple-500 bg-purple-500"
                              : "border-gray-300 dark:border-gray-600"
                          }
                        `}
                        >
                          {otherSelected && (
                            <CheckIcon
                              className="w-3.5 h-3.5 text-white"
                              strokeWidth={3}
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {t("interventions.selection.other" as TranslationKey)}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {t(
                          "interventions.selection.otherDescription" as TranslationKey,
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* "Other" text input */}
                {otherSelected && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <Input
                      value={otherText}
                      onChange={(e) => setOtherText(e.target.value)}
                      placeholder={t(
                        "interventions.selection.otherPlaceholder" as TranslationKey,
                      )}
                      className="w-full bg-white dark:bg-gray-800"
                      disabled={!isActive}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hint information */}
          <div className="text-xs text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg py-2.5 px-3">
            {mode === "single"
              ? `💡 ${t("interventions.selection.promptSingle" as TranslationKey)}`
              : `💡 ${t("interventions.selection.promptMultiple" as TranslationKey)}`}
          </div>

          {/* Confirm button */}
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed h-11 rounded-xl"
          >
            <CheckIcon className="w-4 h-4 mr-2" strokeWidth={2.5} />
            {t("interventions.selection.confirmButton" as TranslationKey)}
          </Button>
        </div>
      )}

      {isCompleted && selectedResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckIcon className="w-4 h-4" strokeWidth={2.5} />
            {t("interventions.selection.completed" as TranslationKey)}
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2.5">
            {selectedResult.selectedOptions.map((option) => (
              <div
                key={option.id}
                className="flex items-center gap-2.5 text-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {option.label}
                  </span>
                  {option.description && (
                    <span className="text-gray-600 dark:text-gray-400 ml-1.5">
                      · {option.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {selectedResult.otherText && (
              <div className="flex items-center gap-2.5 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {t("interventions.selection.other" as TranslationKey)}:{" "}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 italic">
                    {selectedResult.otherText}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "cancelled" && (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
          {t("interventions.selection.cancelled" as TranslationKey)}
        </div>
      )}

      {status === "timeout" && (
        <div className="text-sm text-orange-600 dark:text-orange-400 text-center py-4">
          {t("interventions.selection.timeout" as TranslationKey)}
        </div>
      )}

      {status === "error" && (
        <div className="text-sm text-rose-600 dark:text-rose-400 text-center py-4">
          {t("interventions.selection.error" as TranslationKey)}
        </div>
      )}
    </InterventionCard>
  );
};
