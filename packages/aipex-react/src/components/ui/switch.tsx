import * as React from "react";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled = false, className = "" }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        style={{
          position: "relative",
          display: "inline-flex",
          height: "28px",
          width: "48px",
          flexShrink: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          borderRadius: "9999px",
          border: "2px solid transparent",
          backgroundColor: checked ? "#2563eb" : "#e5e7eb",
          transition: "background-color 200ms ease-in-out",
          opacity: disabled ? 0.5 : 1,
        }}
        className={`focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
        ref={ref}
      >
        <span
          aria-hidden="true"
          style={{
            pointerEvents: "none",
            display: "inline-block",
            height: "20px",
            width: "20px",
            borderRadius: "9999px",
            backgroundColor: "#ffffff",
            boxShadow:
              "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
            transform: checked ? "translateX(20px)" : "translateX(0)",
            transition: "transform 200ms ease-in-out",
            margin: "2px",
          }}
        />
      </button>
    );
  },
);

Switch.displayName = "Switch";

export { Switch };
