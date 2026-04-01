import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@clerk/nextjs", () => ({
  SignUp: () => <div data-testid="sign-up">Sign Up Component</div>,
}));

import SignUpPage from "./page";

describe("SignUpPage", () => {
  it("renders the Clerk SignUp component", () => {
    render(<SignUpPage />);
    expect(screen.getByTestId("sign-up")).toBeInTheDocument();
  });

  it("renders SignUp component text", () => {
    render(<SignUpPage />);
    expect(screen.getByText("Sign Up Component")).toBeInTheDocument();
  });
});
