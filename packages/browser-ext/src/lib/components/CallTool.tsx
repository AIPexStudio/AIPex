import type React from "react";
import { useState } from "react";
import { translatedToolName } from "~/lib/i18n/tool-names";
import { useTranslation } from "../i18n/context";

interface ToolStep {
  type: "think" | "call_tool" | "tool_result";
  content?: string;
  name?: string;
  args?: Record<string, unknown>;
  result?: string;
}

interface CallToolProps {
  steps: ToolStep[];
}

const CallTool: React.FC<CallToolProps> = ({ steps }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { t } = useTranslation();

  if (steps.length === 0) return null;

  // Count different types of steps
  const thinkSteps = steps.filter((s) => s.type === "think");
  const toolSteps = steps.filter((s) => s.type === "call_tool");
  const resultSteps = steps.filter((s) => s.type === "tool_result");

  const hasThinking = thinkSteps.length > 0;
  const hasResults = resultSteps.length > 0;

  return (
    <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-4 mb-4 shadow-sm">
      {/* Header with summary and toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-sm font-semibold text-gray-800 bg-white px-3 py-1 rounded-full shadow-sm border border-blue-200">
            AI Reasoning
          </div>
          <div className="flex items-center space-x-2">
            {hasThinking && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                {thinkSteps.length} think
              </span>
            )}
            {toolSteps.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                {toolSteps.length} tools
              </span>
            )}
            {hasResults && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                {resultSteps.length} results
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-8 h-8 rounded-full bg-white border border-blue-200 hover:border-blue-300 hover:bg-blue-50 flex items-center justify-center transition-all duration-200 shadow-sm"
          aria-label={isExpanded ? "Hide details" : "Show details"}
        >
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <title>{isExpanded ? "Collapse" : "Expand"}</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="space-y-3 border-t border-blue-200 pt-3">
          {steps.map((step, idx) => {
            const stepKey = `${step.type}-${idx}-${step.name || step.content?.slice(0, 20) || ""}`;

            if (step.type === "think") {
              return (
                <div
                  key={stepKey}
                  className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-blue-200 shadow-sm"
                >
                  <div className="flex items-start space-x-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-medium flex-shrink-0 border border-amber-200">
                      thinking
                    </span>
                    <span className="text-gray-800 leading-relaxed font-medium">
                      {step.content}
                    </span>
                  </div>
                </div>
              );
            }
            if (step.type === "call_tool") {
              const toolName = translatedToolName(t, step.name || "");
              return (
                <div
                  key={stepKey}
                  className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-blue-200 shadow-sm"
                >
                  <div className="flex items-start space-x-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-medium flex-shrink-0 border border-blue-200">
                      tool
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">
                        {toolName}
                      </div>
                      {step.args && Object.keys(step.args).length > 0 && (
                        <div className="text-gray-600 text-xs bg-blue-50 rounded px-2 py-1 border border-blue-100">
                          <span className="font-medium">Args:</span>{" "}
                          {Object.keys(step.args)
                            .map((k) => `${k}: ${String(step.args?.[k])}`)
                            .join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            // Only show tool results if showResults is true
            if (step.type === "tool_result" && showResults) {
              return (
                <div
                  key={stepKey}
                  className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-blue-200 shadow-sm"
                >
                  <div className="flex items-start space-x-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-900 text-xs font-medium flex-shrink-0 border border-green-200">
                      result
                    </span>
                    <div className="flex-1">
                      <div className="text-gray-800 break-words leading-relaxed font-medium">
                        {step.result}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}

          {/* Show results toggle button if there are results */}
          {hasResults && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowResults(!showResults)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                {showResults ? "Hide tool results" : "Show tool results"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CallTool;
export type { ToolStep };
