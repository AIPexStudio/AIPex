import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { fetchModelsForPrompt } from "../../../lib/models";

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  priceLevel: "cheap" | "normal" | "expensive";
}

interface ModelChangePromptProps {
  supportedModels: string[];
  onModelChange: (modelId: string) => void;
  currentModel?: string;
  /** Available models to choose from */
  availableModels?: ModelInfo[];
  /** Function to fetch models from API */
  onFetchModels?: () => Promise<ModelInfo[]>;
}

// Default translations for model change prompt
const defaultTranslations = {
  "modelChangePrompt.noMatchingModels": "No Matching Models",
  "modelChangePrompt.contactSupport":
    "None of the requested models are available. Please contact support.",
  "modelChangePrompt.title": "Model Selection",
  "modelChangePrompt.description":
    "The requested model is not available. Please select an alternative:",
  "modelChangePrompt.clickToSwitch": "Click on a model to switch",
  "modelSelector.priceLevel.cheap": "Economy",
  "modelSelector.priceLevel.normal": "Standard",
  "modelSelector.priceLevel.expensive": "Premium",
};

export const ModelChangePrompt: React.FC<ModelChangePromptProps> = ({
  supportedModels,
  onModelChange,
  currentModel,
  availableModels = [],
  onFetchModels,
}) => {
  // Simple translation function
  const t = (key: string): string => {
    return defaultTranslations[key as keyof typeof defaultTranslations] || key;
  };
  const [allModels, setAllModels] = useState<ModelInfo[]>(availableModels);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Resolve the fetch function: use the provided callback or fall back to
  // the built-in fetchModelsForPrompt so models are always loaded.
  const resolvedFetch = useCallback(
    () => (onFetchModels ? onFetchModels() : fetchModelsForPrompt()),
    [onFetchModels],
  );

  // Fetch models from API (always runs — no longer gated on onFetchModels)
  useEffect(() => {
    let cancelled = false;
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const fetched = await resolvedFetch();
        if (!cancelled) {
          setAllModels(fetched);
        }
      } catch (_error) {
        // Keep using availableModels as fallback
      } finally {
        if (!cancelled) {
          setIsLoadingModels(false);
        }
      }
    };
    loadModels();
    return () => {
      cancelled = true;
    };
  }, [resolvedFetch]);

  // Update models when availableModels prop changes
  useEffect(() => {
    if (availableModels.length > 0) {
      setAllModels(availableModels);
    }
  }, [availableModels]);

  // Find matching models from supported models list
  const getMatchingModels = (): ModelInfo[] => {
    return allModels.filter((model: ModelInfo) =>
      supportedModels.some(
        (supportedModel) =>
          model.id === supportedModel ||
          model.name.toLowerCase().includes(supportedModel.toLowerCase()) ||
          supportedModel.toLowerCase().includes(model.name.toLowerCase()),
      ),
    );
  };

  const matchingModels = getMatchingModels();

  if (isLoadingModels) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-sm text-blue-700">
            Loading available models...
          </span>
        </div>
      </div>
    );
  }

  if (matchingModels.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              {t("modelChangePrompt.noMatchingModels")}
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>{t("modelChangePrompt.contactSupport")}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            {t("modelChangePrompt.title")}
          </h3>
          <div className="mt-2 text-sm text-blue-700">
            <p className="mb-3">{t("modelChangePrompt.description")}</p>
            <div className="space-y-2">
              {matchingModels.map((model) => (
                <button
                  type="button"
                  key={model.id}
                  onClick={() => onModelChange(model.id)}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    currentModel === model.id
                      ? "bg-blue-100 border-blue-300 text-blue-900"
                      : "bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{model.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {model.description}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          model.priceLevel === "cheap"
                            ? "bg-green-100 text-green-800"
                            : model.priceLevel === "normal"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {t(`modelSelector.priceLevel.${model.priceLevel}`)}
                      </span>
                      {currentModel === model.id && (
                        <svg
                          className="h-4 w-4 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-blue-600">
              {t("modelChangePrompt.clickToSwitch")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
