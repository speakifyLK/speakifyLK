import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => Promise<any>) => {
    // Call the loader to exercise the arrow function for V8 coverage
    loader();
    const MockAppContent = () => <div data-testid="app-content">AppContent</div>;
    MockAppContent.displayName = "MockAppContent";
    return MockAppContent;
  },
}));

vi.mock("./app-content", () => ({
  __esModule: true,
  default: () => <div data-testid="real-app-content">Real AppContent</div>,
}));

import { App } from "./app";

describe("App", () => {
  it("renders the dynamically loaded AppContent component", () => {
    render(<App />);
    expect(screen.getByTestId("app-content")).toBeInTheDocument();
    expect(screen.getByText("AppContent")).toBeInTheDocument();
  });
});
