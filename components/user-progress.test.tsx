import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

import { UserProgress } from "./user-progress";

const mockCourse = {
  id: 1,
  title: "Sinhala",
  imageSrc: "/sinhala.svg",
};

describe("UserProgress", () => {
  it("renders course image", () => {
    render(
      <UserProgress
        activeCourse={mockCourse}
        hearts={5}
        points={100}
        hasActiveSubscription={false}
      />
    );

    const img = screen.getByAltText("Sinhala");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/sinhala.svg");
  });

  it("renders points value", () => {
    render(
      <UserProgress
        activeCourse={mockCourse}
        hearts={5}
        points={100}
        hasActiveSubscription={false}
      />
    );

    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders hearts value when no subscription", () => {
    render(
      <UserProgress
        activeCourse={mockCourse}
        hearts={3}
        points={50}
        hasActiveSubscription={false}
      />
    );

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders infinity icon when has active subscription", () => {
    const { container } = render(
      <UserProgress
        activeCourse={mockCourse}
        hearts={5}
        points={100}
        hasActiveSubscription={true}
      />
    );

    // InfinityIcon from lucide-react renders an SVG. Hearts count should NOT appear.
    expect(screen.queryByText("5")).not.toBeInTheDocument();
    // The svg should have the class for the infinity icon
    const svg = container.querySelector("svg.stroke-3");
    expect(svg).toBeInTheDocument();
  });

  it("renders links to /courses, /shop, and /profile", () => {
    render(
      <UserProgress
        activeCourse={mockCourse}
        hearts={5}
        points={100}
        hasActiveSubscription={false}
      />
    );

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/courses");
    expect(hrefs).toContain("/shop");
    expect(hrefs).toContain("/profile");
  });

  it("renders Points and Hearts images", () => {
    render(
      <UserProgress
        activeCourse={mockCourse}
        hearts={5}
        points={100}
        hasActiveSubscription={false}
      />
    );

    expect(screen.getByAltText("Points")).toBeInTheDocument();
    expect(screen.getByAltText("Hearts")).toBeInTheDocument();
  });

  it("renders streak with fire icon", () => {
    const { container } = render(
      <UserProgress
        activeCourse={mockCourse}
        hearts={5}
        points={100}
        hasActiveSubscription={false}
        streak={7}
      />
    );

    expect(screen.getByText("7")).toBeInTheDocument();
    // Flame icon from lucide-react renders an SVG with fill-orange-500
    const flameSvg = container.querySelector("svg.fill-orange-500");
    expect(flameSvg).toBeInTheDocument();
  });

  it("renders streak as 0 by default when not provided", () => {
    render(
      <UserProgress
        activeCourse={mockCourse}
        hearts={5}
        points={100}
        hasActiveSubscription={false}
      />
    );

    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
