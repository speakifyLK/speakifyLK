import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRedirect = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

const mockGetIsAdmin = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin", () => ({
  getIsAdmin: mockGetIsAdmin,
}));

vi.mock("./app", () => ({
  App: () => <div data-testid="admin-app">Admin App</div>,
}));

import AdminPage from "./page";

describe("AdminPage", () => {
  it("redirects to '/' when user is not an admin", async () => {
    mockGetIsAdmin.mockResolvedValue(false);
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(AdminPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(mockGetIsAdmin).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("renders the App component when user is an admin", async () => {
    mockGetIsAdmin.mockResolvedValue(true);
    mockRedirect.mockReset();

    const result = await AdminPage();
    render(result);

    expect(mockGetIsAdmin).toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByTestId("admin-app")).toBeInTheDocument();
    expect(screen.getByText("Admin App")).toBeInTheDocument();
  });
});
