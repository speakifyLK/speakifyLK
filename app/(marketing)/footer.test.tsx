import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, className, ...props }: any) => (
    <button className={className} {...props}>
      {children}
    </button>
  ),
}));

import { Footer } from "./footer";

describe("Marketing Footer", () => {
  it("renders the footer container", () => {
    const { container } = render(<Footer />);
    const outerDiv = container.firstElementChild;
    expect(outerDiv).toBeInTheDocument();
    expect(outerDiv).toHaveClass("hidden", "h-20", "w-full", "lg:block");
  });

  it("renders Sinhala language button", () => {
    render(<Footer />);
    expect(screen.getByText("Sinhala")).toBeInTheDocument();
  });

  it("renders Tamil language button", () => {
    render(<Footer />);
    expect(screen.getByText("Tamil")).toBeInTheDocument();
  });

  it("renders Sinhala flag image", () => {
    render(<Footer />);
    const sinhalaImg = screen.getByAltText("Sinhala");
    expect(sinhalaImg).toBeInTheDocument();
    expect(sinhalaImg).toHaveAttribute("src", "/lk.jpg");
    expect(sinhalaImg).toHaveAttribute("height", "32");
    expect(sinhalaImg).toHaveAttribute("width", "40");
    expect(sinhalaImg).toHaveClass("mr-4", "rounded-md");
  });

  it("renders Tamil flag image", () => {
    render(<Footer />);
    const tamilImg = screen.getByAltText("Tamil");
    expect(tamilImg).toBeInTheDocument();
    expect(tamilImg).toHaveAttribute("src", "/lk.jpg");
    expect(tamilImg).toHaveAttribute("height", "32");
    expect(tamilImg).toHaveAttribute("width", "40");
    expect(tamilImg).toHaveClass("mr-4", "rounded-md");
  });

  it("renders two language buttons with cursor-default class", () => {
    render(<Footer />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    buttons.forEach((button) => {
      expect(button).toHaveClass("w-auto", "cursor-default");
    });
  });

  it("has border-t-2 styling on container", () => {
    const { container } = render(<Footer />);
    const outerDiv = container.firstElementChild;
    expect(outerDiv).toHaveClass("border-t-2", "border-slate-200");
  });

  it("renders inner container with correct layout classes", () => {
    const { container } = render(<Footer />);
    const innerDiv = container.firstElementChild?.firstElementChild;
    expect(innerDiv).toHaveClass(
      "mx-auto",
      "flex",
      "h-full",
      "max-w-screen-lg",
      "items-center",
      "justify-evenly"
    );
  });

  it("flag images have inline width/height auto styles", () => {
    render(<Footer />);
    const sinhalaImg = screen.getByAltText("Sinhala");
    expect(sinhalaImg.style.width).toBe("auto");
    expect(sinhalaImg.style.height).toBe("auto");

    const tamilImg = screen.getByAltText("Tamil");
    expect(tamilImg.style.width).toBe("auto");
    expect(tamilImg.style.height).toBe("auto");
  });
});
