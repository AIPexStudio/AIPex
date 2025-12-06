import { cn } from "../../../../lib/utils";
import type { ModelSelectorSlotProps } from "../../../../types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../ui/select";

/**
 * Default model selector slot component
 */
export function DefaultModelSelector({
  value,
  onChange,
  models = [],
}: ModelSelectorSlotProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors",
          'hover:bg-accent hover:text-foreground [&[aria-expanded="true"]]:bg-accent [&[aria-expanded="true"]]:text-foreground',
        )}
      >
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Compact model selector (icon only)
 */
export function CompactModelSelector({
  value,
  onChange,
  models = [],
}: ModelSelectorSlotProps) {
  const selectedModel = models.find((m) => m.value === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "w-auto border-none bg-transparent shadow-none transition-colors px-2",
          'hover:bg-accent [&[aria-expanded="true"]]:bg-accent',
        )}
      >
        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
          {selectedModel?.name || "Model"}
        </span>
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
