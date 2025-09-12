import React, { useState } from "react";
import { useToolName } from "~/lib/i18n/tool-names";
import { useTranslation } from "~/lib/i18n/hooks";

// Simple icon components in case lucide-react is not available
const CheckIcon = () => <span className="text-green-600">✓</span>;
const ChevronDownIcon = () => <span className="text-gray-600">▼</span>;
const ChevronUpIcon = () => <span className="text-gray-600">▲</span>;

interface ToolFallbackProps {
  toolName: string;
  argsText: string;
  result?: any;
  status?: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
}

export const ToolFallback: React.FC<ToolFallbackProps> = ({
  toolName,
  argsText,
  result,
  status = 'completed',
  error
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { t } = useTranslation();
  const translatedToolName = useToolName(toolName);

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>;
      case 'in-progress':
        return <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>;
      case 'completed':
        return <CheckIcon />;
      case 'failed':
        return <span className="w-4 h-4 text-red-600 text-sm">✗</span>;
      default:
        return <CheckIcon />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'border-gray-200 bg-gray-50';
      case 'in-progress':
        return 'border-blue-200 bg-blue-50';
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={`mb-4 flex w-full flex-col gap-3 rounded-lg border py-3 ${getStatusColor()}`}>
      <div className="flex items-center gap-2 px-4">
        {getStatusIcon()}
        <p className="flex-grow text-sm">
          Used tool: <b className="font-semibold">{translatedToolName}</b>
        </p>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-white/50 rounded transition-colors"
        >
          {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="flex flex-col gap-2 border-t border-gray-200 pt-2">
          <div className="px-4">
            <div className="text-xs font-medium text-gray-700 mb-1">Arguments:</div>
            <pre className="whitespace-pre-wrap text-xs bg-white/50 rounded p-2 border">
              {argsText}
            </pre>
          </div>
          
          {result !== undefined && (
            <div className="border-t border-dashed border-gray-200 px-4 pt-2">
              <div className="text-xs font-medium text-gray-700 mb-1">Result:</div>
              <pre className="whitespace-pre-wrap text-xs bg-white/50 rounded p-2 border">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
          
          {error && (
            <div className="border-t border-dashed border-red-200 px-4 pt-2">
              <div className="text-xs font-medium text-red-700 mb-1">Error:</div>
              <pre className="whitespace-pre-wrap text-xs bg-red-50 rounded p-2 border border-red-200 text-red-700">
                {error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
