import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/font/google", () => ({
  Nunito: () => ({ className: "mock-nunito-font" }),
}));

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: (props: any) => (
    <div data-testid="toaster" data-theme={props.theme} />
  ),
}));

vi.mock("@/components/modals/exit-modal", () => ({
  ExitModal: () => <div data-testid="exit-modal" />,
}));

vi.mock("@/components/modals/hearts-modal", () => ({
  HeartsModal: () => <div data-testid="hearts-modal" />,
}));

vi.mock("@/components/modals/practice-modal", () => ({
  PracticeModal: () => <div data-testid="practice-modal" />,
}));

vi.mock("@/config", () => ({
  siteConfig: { title: "Speakify", description: "Test description" },
}));

import RootLayout from "./layout";

// Suppress React's "<html> cannot be a child of <div>" warning since RootLayout
// renders <html> which jsdom cannot nest inside the test container div.
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("cannot be a child of"))
      return;
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

// Helper: RootLayout renders <html> and <body> which jsdom strips when
// nested inside the test container div.  We render just the *body content*
// by extracting the JSX returned by the component, then rendering the body
// children directly.
const renderLayout = (children: React.ReactNode) => {
  // RootLayout returns ClerkProvider > html > body > ...
  // Because our ClerkProvider mock is a passthrough, the JSX tree is:
  //   <html lang="en"><body className="...">...{children}</body></html>
  // jsdom cannot nest <html> inside <div>, so we render into
  // document.documentElement level.
  // Instead, let's just render normally — jsdom will hoist body content.
  return render(<RootLayout>{children}</RootLayout>);
};

describe("RootLayout", () => {
  it("renders children", () => {
    renderLayout(<div data-testid="child">Hello</div>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders Toaster with light theme", () => {
    renderLayout(<div>content</div>);
    const toaster = screen.getByTestId("toaster");
    expect(toaster).toBeInTheDocument();
    expect(toaster).toHaveAttribute("data-theme", "light");
  });

  it("renders ExitModal", () => {
    renderLayout(<div>content</div>);
    expect(screen.getByTestId("exit-modal")).toBeInTheDocument();
  });

  it("renders HeartsModal", () => {
    renderLayout(<div>content</div>);
    expect(screen.getByTestId("hearts-modal")).toBeInTheDocument();
  });

  it("renders PracticeModal", () => {
    renderLayout(<div>content</div>);
    expect(screen.getByTestId("practice-modal")).toBeInTheDocument();
  });

  it("renders all modals and children together", () => {
    renderLayout(<div data-testid="child">content</div>);
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
    expect(screen.getByTestId("exit-modal")).toBeInTheDocument();
    expect(screen.getByTestId("hearts-modal")).toBeInTheDocument();
    expect(screen.getByTestId("practice-modal")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});

describe("RootLayout JSX structure", () => {
  it("returns ClerkProvider wrapping html with lang=en", () => {
    // Call the component function directly to inspect JSX structure
    const jsx = RootLayout({ children: <div>test</div> });
    // The outermost element rendered by the mock is <> (fragment from ClerkProvider)
    // Its child should be <html lang="en">
    // We can inspect by rendering in a special way — or just check props on the JSX tree
    // Since ClerkProvider is mocked as passthrough, the top-level JSX child is <html>
    const htmlElement = jsx.props.children;
    expect(htmlElement.type).toBe("html");
    expect(htmlElement.props.lang).toBe("en");
  });

  it("has body with Nunito font className", () => {
    const jsx = RootLayout({ children: <div>test</div> });
    const htmlElement = jsx.props.children;
    const bodyElement = htmlElement.props.children;
    expect(bodyElement.type).toBe("body");
    expect(bodyElement.props.className).toBe("mock-nunito-font");
  });

  it("passes ClerkProvider appearance config", () => {
    // Need to check that ClerkProvider receives the right props
    // We can re-mock to capture props
    const jsx = RootLayout({ children: <div>test</div> });
    // The JSX is ClerkProvider > html > body > ...
    // Since our mock is a passthrough, we check the original component call
    // by inspecting the JSX tree. The top element IS the ClerkProvider mock output.
    // Let's verify by checking afterSignOutUrl was passed
    expect(jsx.props.afterSignOutUrl).toBe("/");
    expect(jsx.props.appearance).toEqual({
      layout: { logoImageUrl: "/favicon.ico" },
      variables: { colorPrimary: "#22C55E" },
    });
  });
});

describe("RootLayout exports", () => {
  it("exports viewport with themeColor", async () => {
    const mod = await import("./layout");
    expect(mod.viewport).toEqual({ themeColor: "#22C55E" });
  });

  it("exports metadata from siteConfig", async () => {
    const mod = await import("./layout");
    expect(mod.metadata).toBeDefined();
    expect(mod.metadata).toEqual({
      title: "Speakify",
      description: "Test description",
    });
  });
});
