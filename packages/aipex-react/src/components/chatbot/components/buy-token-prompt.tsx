import type React from "react";
import { buildWebsiteUrl } from "../../../lib/config/website.js";

interface BuyTokenPromptProps {
  onBuyTokens?: () => void;
  currentCredits?: number;
  requiredCredits?: number;
  pricingUrl?: string;
}

// Default translations for buy token prompt
const defaultTranslations = {
  "buyTokenPrompt.title": "Insufficient Credits",
  "buyTokenPrompt.description":
    "You need more credits to continue. Purchase credits to keep using the AI assistant.",
  "buyTokenPrompt.buyButton": "Buy Credits",
  "buyTokenPrompt.viewPricing": "View Pricing",
  "buyTokenPrompt.helpText": "Credits are used for AI model usage costs.",
};

export const BuyTokenPrompt: React.FC<BuyTokenPromptProps> = ({
  onBuyTokens,
  currentCredits,
  requiredCredits,
  pricingUrl = buildWebsiteUrl("/pricing"),
}) => {
  // Simple translation function
  const t = (key: string): string => {
    return defaultTranslations[key as keyof typeof defaultTranslations] || key;
  };

  const handleBuyTokens = () => {
    if (onBuyTokens) {
      onBuyTokens();
    } else {
      // Default action: open ClaudeChrome website
      window.open(pricingUrl, "_blank");
    }
  };

  const handleViewPricing = () => {
    window.open(pricingUrl, "_blank");
  };

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-orange-400"
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
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-orange-800">
            {t("buyTokenPrompt.title")}
          </h3>
          <div className="mt-2 text-sm text-orange-700">
            <p className="mb-3">{t("buyTokenPrompt.description")}</p>

            {/* Credits information */}
            {(currentCredits !== undefined ||
              requiredCredits !== undefined) && (
              <div className="mb-3 p-3 bg-orange-100 rounded-md">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Current Credits:</span>
                  <span className="font-mono">{currentCredits || 0}</span>
                </div>
                {requiredCredits && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="font-medium">Required:</span>
                    <span className="font-mono">{requiredCredits}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleBuyTokens}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
                {t("buyTokenPrompt.buyButton")}
              </button>
              <button
                type="button"
                onClick={handleViewPricing}
                className="inline-flex items-center px-3 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {t("buyTokenPrompt.viewPricing")}
              </button>
            </div>

            <div className="mt-3 text-xs text-orange-600">
              {t("buyTokenPrompt.helpText")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
