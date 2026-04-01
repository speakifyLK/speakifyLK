import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@clerk/nextjs", () => ({
  SignIn: () => <div data-testid="sign-in">Sign In Component</div>,
}));

import SignInPage from "./page";

describe("SignInPage", () => {
  it("renders the Clerk SignIn component", () => {
    render(<SignInPage />);
    expect(screen.getByTestId("sign-in")).toBeInTheDocument();
  });

  it("renders SignIn component text", () => {
    render(<SignInPage />);
    expect(screen.getByText("Sign In Component")).toBeInTheDocument();
  });
});
