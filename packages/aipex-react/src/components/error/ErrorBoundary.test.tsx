import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

// Component that throws on render
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test rendering error");
  }
  return <div>Normal content</div>;
}

describe("ErrorBoundary", () => {
  // Suppress React error boundary console.error during tests
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Hello World")).toBeTruthy();
  });

  it("renders fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Try Again")).toBeTruthy();
  });

  it("shows error details in expandable section", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Error details")).toBeTruthy();
    expect(screen.getByText("Test rendering error")).toBeTruthy();
  });

  it("resets error state when Try Again is clicked", () => {
    // Use a stateful wrapper so we can control the throw behavior
    let shouldThrow = true;
    function ConditionalThrower() {
      if (shouldThrow) throw new Error("Boom");
      return <div>Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrower />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();

    // Stop throwing before clicking retry
    shouldThrow = false;
    fireEvent.click(screen.getByText("Try Again"));

    expect(screen.getByText("Recovered")).toBeTruthy();
  });

  it("renders custom fallback when provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error UI")).toBeTruthy();
  });

  it("calls onError callback when an error is caught", () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Test rendering error" }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });
});
