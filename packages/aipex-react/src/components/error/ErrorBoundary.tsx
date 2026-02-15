/**
 * ErrorBoundary
 * Catches React rendering errors and displays a recovery UI
 * instead of an unrecoverable white screen.
 */

import React from "react";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional fallback UI to render when an error is caught. */
  fallback?: React.ReactNode;
  /** Optional callback invoked when an error is caught. */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error without exposing sensitive data
    console.error(
      "[ErrorBoundary] Uncaught rendering error:",
      error.message,
    );

    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: "24px",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            textAlign: "center",
            color: "var(--foreground, #333)",
            backgroundColor: "var(--background, #fff)",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "16px",
              lineHeight: 1,
            }}
            aria-hidden="true"
          >
            !
          </div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              margin: "0 0 8px",
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted-foreground, #666)",
              margin: "0 0 20px",
              maxWidth: "320px",
            }}
          >
            An unexpected error occurred. Click the button below to try
            recovering.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: "8px 20px",
              fontSize: "14px",
              fontWeight: 500,
              borderRadius: "6px",
              border: "1px solid var(--border, #ddd)",
              backgroundColor: "var(--primary, #333)",
              color: "var(--primary-foreground, #fff)",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          {this.state.error && (
            <details
              style={{
                marginTop: "16px",
                fontSize: "12px",
                color: "var(--muted-foreground, #888)",
                maxWidth: "400px",
                textAlign: "left",
              }}
            >
              <summary style={{ cursor: "pointer" }}>Error details</summary>
              <pre
                style={{
                  marginTop: "8px",
                  padding: "8px",
                  borderRadius: "4px",
                  backgroundColor: "var(--muted, #f5f5f5)",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: "120px",
                }}
              >
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
