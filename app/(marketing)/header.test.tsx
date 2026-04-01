import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { mockIsSignedIn } = vi.hoisted(() => ({
  mockIsSignedIn: { value: false },
}));

vi.mock("@clerk/nextjs", () => ({
  ClerkLoaded: ({ children }: any) => <div data-testid="clerk-loaded">{children}</div>,
  ClerkLoading: ({ children }: any) => <div data-testid="clerk-loading">{children}</div>,
  SignedIn: ({ children }: any) => <div data-testid="signed-in">{children}</div>,
  SignedOut: ({ children }: any) => <div data-testid="signed-out">{children}</div>,
  SignInButton: ({ children, mode }: any) => (
    <div data-testid="sign-in-button" data-mode={mode}>
      {children}
    </div>
  ),
  UserButton: () => <div data-testid="user-button" />,
  useAuth: () => ({ isSignedIn: mockIsSignedIn.value }),
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/config", () => ({
  links: {
    sourceCode: "https://github.com/speakifyLK/speakifyLK",
    email: "speakifylk@gmail.com",
  },
}));

vi.mock("lucide-react", () => ({
  Loader: (props: any) => <div data-testid="loader" {...props} />,
}));

import { Header } from "./header";

describe("Marketing Header", () => {
  beforeEach(() => {
    mockIsSignedIn.value = false;
  });

  it("renders header element", () => {
    render(<Header />);
    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass("h-20", "w-full", "border-b-2");
  });

  it("renders the Speakify title", () => {
    render(<Header />);
    const title = screen.getByText("Speakify");
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe("H1");
    expect(title).toHaveClass("text-2xl", "font-extrabold", "text-green-600");
  });

  it("renders the mascot image with correct attributes", () => {
    render(<Header />);
    const mascot = screen.getByAltText("Mascot");
    expect(mascot).toBeInTheDocument();
    expect(mascot).toHaveAttribute("src", "/mascot.svg");
    expect(mascot).toHaveAttribute("height", "40");
    expect(mascot).toHaveAttribute("width", "40");
  });

  it("renders home link with correct href", () => {
    render(<Header />);
    const homeLink = screen.getByText("Speakify").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
    expect(homeLink).toHaveClass("flex", "items-center", "gap-x-3");
  });

  it("renders ClerkLoading with loader spinner", () => {
    render(<Header />);
    expect(screen.getByTestId("clerk-loading")).toBeInTheDocument();
    const loader = screen.getByTestId("loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("h-5", "w-5", "animate-spin");
  });

  it("renders ClerkLoaded section", () => {
    render(<Header />);
    expect(screen.getByTestId("clerk-loaded")).toBeInTheDocument();
  });

  it("renders SignedIn section with UserButton", () => {
    render(<Header />);
    expect(screen.getByTestId("signed-in")).toBeInTheDocument();
    expect(screen.getByTestId("user-button")).toBeInTheDocument();
  });

  it("renders SignedOut section with Login button", () => {
    render(<Header />);
    expect(screen.getByTestId("signed-out")).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("renders SignInButton with modal mode", () => {
    render(<Header />);
    const signInButton = screen.getByTestId("sign-in-button");
    expect(signInButton).toHaveAttribute("data-mode", "modal");
  });

  it("renders GitHub source code link with correct attributes", () => {
    render(<Header />);
    const githubImg = screen.getByAltText("Source Code");
    expect(githubImg).toBeInTheDocument();
    expect(githubImg).toHaveAttribute("src", "/github.svg");
    expect(githubImg).toHaveAttribute("height", "20");
    expect(githubImg).toHaveAttribute("width", "20");

    const githubLink = githubImg.closest("a");
    expect(githubLink).toHaveAttribute("href", "https://github.com/speakifyLK/speakifyLK");
    expect(githubLink).toHaveAttribute("target", "_blank");
    expect(githubLink).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("applies pt-3 class to GitHub link when not signed in", () => {
    mockIsSignedIn.value = false;
    render(<Header />);
    const githubLink = screen.getByAltText("Source Code").closest("a");
    expect(githubLink).toHaveClass("pt-3");
    expect(githubLink).not.toHaveClass("pt-1.5");
  });

  it("applies pt-1.5 class to GitHub link when signed in", () => {
    mockIsSignedIn.value = true;
    render(<Header />);
    const githubLink = screen.getByAltText("Source Code").closest("a");
    expect(githubLink).toHaveClass("pt-1.5");
    expect(githubLink).not.toHaveClass("pt-3");
  });
});
