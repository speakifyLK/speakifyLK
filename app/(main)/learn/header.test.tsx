import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, _asChild, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: (props: any) => <div data-testid="arrow-left" {...props} />,
}));

import { Header } from "./header";

describe("Header", () => {
  it("renders the title", () => {
    render(<Header title="Sinhala" />);
    expect(screen.getByText("Sinhala")).toBeInTheDocument();
  });

  it("renders a link to /courses", () => {
    render(<Header title="Sinhala" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/courses");
  });

  it("renders the ArrowLeft icon", () => {
    render(<Header title="Sinhala" />);
    expect(screen.getByTestId("arrow-left")).toBeInTheDocument();
  });

  it("renders the title as h1", () => {
    render(<Header title="Sinhala" />);
    const heading = screen.getByText("Sinhala");
    expect(heading.tagName).toBe("H1");
    expect(heading).toHaveClass("text-lg", "font-bold");
  });

  it("renders an aria-hidden spacer div", () => {
    const { container } = render(<Header title="Test" />);
    const hiddenDiv = container.querySelector("[aria-hidden]");
    expect(hiddenDiv).toBeInTheDocument();
  });
});
