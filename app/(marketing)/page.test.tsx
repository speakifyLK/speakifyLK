import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
  SignUpButton: ({ children, mode }: any) => (
    <div data-testid="sign-up-button" data-mode={mode}>
      {children}
    </div>
  ),
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
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild) {
      // Render children directly (simulating Slot behavior for asChild)
      return <>{children}</>;
    }
    return <button {...props}>{children}</button>;
  },
}));

vi.mock("lucide-react", () => ({
  Loader: (props: any) => <div data-testid="loader" {...props} />,
}));

import MarketingPage from "./page";

describe("Marketing Page", () => {
  it("renders hero image", () => {
    render(<MarketingPage />);
    const hero = screen.getByAltText("Hero");
    expect(hero).toBeInTheDocument();
    expect(hero).toHaveAttribute("src", "/hero.svg");
  });

  it("renders the main heading text", () => {
    render(<MarketingPage />);
    expect(
      screen.getByText("Learn, practice and master new languages with Speakify.")
    ).toBeInTheDocument();
  });

  it("renders heading with correct classes", () => {
    render(<MarketingPage />);
    const heading = screen.getByText("Learn, practice and master new languages with Speakify.");
    expect(heading.tagName).toBe("H1");
    expect(heading).toHaveClass("text-xl", "font-bold", "text-neutral-600");
  });

  it("renders ClerkLoading with loader", () => {
    render(<MarketingPage />);
    expect(screen.getByTestId("clerk-loading")).toBeInTheDocument();
    const loader = screen.getByTestId("loader");
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveClass("h-5", "w-5", "animate-spin");
  });

  it("renders ClerkLoaded section", () => {
    render(<MarketingPage />);
    expect(screen.getByTestId("clerk-loaded")).toBeInTheDocument();
  });

  it("renders SignedOut section with Get Started button", () => {
    render(<MarketingPage />);
    expect(screen.getByTestId("signed-out")).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("renders SignedOut section with I already have an account button", () => {
    render(<MarketingPage />);
    expect(screen.getByText("I already have an account")).toBeInTheDocument();
  });

  it("renders SignUpButton with modal mode", () => {
    render(<MarketingPage />);
    const signUpButton = screen.getByTestId("sign-up-button");
    expect(signUpButton).toHaveAttribute("data-mode", "modal");
  });

  it("renders SignInButton with modal mode", () => {
    render(<MarketingPage />);
    const signInButton = screen.getByTestId("sign-in-button");
    expect(signInButton).toHaveAttribute("data-mode", "modal");
  });

  it("renders SignedIn section with Continue Learning link", () => {
    render(<MarketingPage />);
    expect(screen.getByTestId("signed-in")).toBeInTheDocument();
    const learnLink = screen.getByText("Continue Learning");
    expect(learnLink).toBeInTheDocument();
    expect(learnLink).toHaveAttribute("href", "/learn");
  });

  it("renders hero image container with correct responsive classes", () => {
    const { container } = render(<MarketingPage />);
    const heroContainer = container.querySelector(".relative.mb-8.h-\\[240px\\].w-\\[240px\\]");
    expect(heroContainer).toBeInTheDocument();
  });

  it("renders hero image with priority and fill attributes", () => {
    render(<MarketingPage />);
    const hero = screen.getByAltText("Hero");
    expect(hero).toHaveAttribute("sizes", "(min-width: 1024px) 424px, 240px");
  });

  it("renders outer container with correct classes", () => {
    const { container } = render(<MarketingPage />);
    const outerDiv = container.firstElementChild;
    expect(outerDiv).toHaveClass(
      "mx-auto",
      "flex",
      "w-full",
      "flex-1",
      "flex-col",
      "items-center",
      "justify-center",
      "gap-2",
      "p-4"
    );
  });
});
