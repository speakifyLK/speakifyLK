import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => {
    const MockAppContent = () => <div data-testid="app-content">AppContent</div>;
    MockAppContent.displayName = "MockAppContent";
    return MockAppContent;
  },
}));

import { App } from "./app";

describe("App", () => {
  it("renders the dynamically loaded AppContent component", () => {
    render(<App />);
    expect(screen.getByTestId("app-content")).toBeInTheDocument();
    expect(screen.getByText("AppContent")).toBeInTheDocument();
  });
});
