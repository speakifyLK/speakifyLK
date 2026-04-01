import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

import { Promo } from "./promo";

describe("Promo", () => {
  it("renders 'Upgrade to Pro' heading", () => {
    render(<Promo />);

    expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
  });

  it("renders description text", () => {
    render(<Promo />);

    expect(screen.getByText("Get unlimited hearts and more!")).toBeInTheDocument();
  });

  it("renders 'Upgrade today' link", () => {
    render(<Promo />);

    const link = screen.getByText("Upgrade today");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "/shop");
  });

  it("renders the Pro image", () => {
    render(<Promo />);

    const img = screen.getByAltText("Pro");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/unlimited.svg");
  });
});
