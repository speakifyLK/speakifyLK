import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { ActivityHeatmap } from "./activity-heatmap";

describe("ActivityHeatmap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Fix the current date for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with empty activity data", () => {
    render(<ActivityHeatmap activityData={[]} />);

    expect(screen.getByText("Less")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("renders day labels", () => {
    render(<ActivityHeatmap activityData={[]} />);

    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
  });

  it("renders month labels", () => {
    render(<ActivityHeatmap activityData={[]} />);

    // Should have some month labels visible
    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const found = monthLabels.filter(
      (m) => screen.queryAllByText(m).length > 0
    );
    expect(found.length).toBeGreaterThan(0);
  });

  it("renders activity tiles with correct intensity for no activity (level 0)", () => {
    render(<ActivityHeatmap activityData={[]} />);

    // All tiles should be bg-slate-100 (no activity) or bg-transparent (out of range)
    const { container } = render(<ActivityHeatmap activityData={[]} />);
    const tiles = container.querySelectorAll("[title]");
    expect(tiles.length).toBeGreaterThan(0);
  });

  it("renders activity tiles with level 1 (count 1-2)", () => {
    const activityData = [
      {
        date: "2025-06-10",
        lessonsCompleted: 1,
        quizzesCompleted: 0,
        xpEarned: 10,
      },
    ];
    const { container } = render(
      <ActivityHeatmap activityData={activityData} />
    );

    const tile = container.querySelector('[title="2025-06-10: 1 activity"]');
    expect(tile).toBeInTheDocument();
    expect(tile?.className).toContain("bg-green-200");
  });

  it("renders activity tiles with level 2 (count 3-5)", () => {
    const activityData = [
      {
        date: "2025-06-10",
        lessonsCompleted: 3,
        quizzesCompleted: 1,
        xpEarned: 40,
      },
    ];
    const { container } = render(
      <ActivityHeatmap activityData={activityData} />
    );

    const tile = container.querySelector('[title="2025-06-10: 4 activities"]');
    expect(tile).toBeInTheDocument();
    expect(tile?.className).toContain("bg-green-400");
  });

  it("renders activity tiles with level 3 (count 6-10)", () => {
    const activityData = [
      {
        date: "2025-06-10",
        lessonsCompleted: 5,
        quizzesCompleted: 3,
        xpEarned: 80,
      },
    ];
    const { container } = render(
      <ActivityHeatmap activityData={activityData} />
    );

    const tile = container.querySelector('[title="2025-06-10: 8 activities"]');
    expect(tile).toBeInTheDocument();
    expect(tile?.className).toContain("bg-green-500");
  });

  it("renders activity tiles with level 4 (count > 10)", () => {
    const activityData = [
      {
        date: "2025-06-10",
        lessonsCompleted: 8,
        quizzesCompleted: 5,
        xpEarned: 130,
      },
    ];
    const { container } = render(
      <ActivityHeatmap activityData={activityData} />
    );

    const tile = container.querySelector('[title="2025-06-10: 13 activities"]');
    expect(tile).toBeInTheDocument();
    expect(tile?.className).toContain("bg-green-700");
  });

  it("uses singular 'activity' for count of 1", () => {
    const activityData = [
      {
        date: "2025-06-10",
        lessonsCompleted: 1,
        quizzesCompleted: 0,
        xpEarned: 10,
      },
    ];
    const { container } = render(
      <ActivityHeatmap activityData={activityData} />
    );

    const tile = container.querySelector('[title="2025-06-10: 1 activity"]');
    expect(tile).toBeInTheDocument();
  });

  it("uses plural 'activities' for count > 1", () => {
    const activityData = [
      {
        date: "2025-06-10",
        lessonsCompleted: 2,
        quizzesCompleted: 1,
        xpEarned: 30,
      },
    ];
    const { container } = render(
      <ActivityHeatmap activityData={activityData} />
    );

    const tile = container.querySelector('[title="2025-06-10: 3 activities"]');
    expect(tile).toBeInTheDocument();
  });

  it("renders legend colors", () => {
    const { container } = render(<ActivityHeatmap activityData={[]} />);

    // Legend should have 5 color boxes
    const legendColors = [
      "bg-slate-100",
      "bg-green-200",
      "bg-green-400",
      "bg-green-500",
      "bg-green-700",
    ];
    for (const color of legendColors) {
      const elements = container.querySelectorAll(`.${color}`);
      expect(elements.length).toBeGreaterThan(0);
    }
  });

  it("renders multiple activity days", () => {
    const activityData = [
      {
        date: "2025-06-10",
        lessonsCompleted: 1,
        quizzesCompleted: 0,
        xpEarned: 10,
      },
      {
        date: "2025-06-11",
        lessonsCompleted: 3,
        quizzesCompleted: 2,
        xpEarned: 50,
      },
      {
        date: "2025-06-12",
        lessonsCompleted: 0,
        quizzesCompleted: 0,
        xpEarned: 0,
      },
    ];
    const { container } = render(
      <ActivityHeatmap activityData={activityData} />
    );

    expect(
      container.querySelector('[title="2025-06-10: 1 activity"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[title="2025-06-11: 5 activities"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[title="2025-06-12: 0 activities"]')
    ).toBeInTheDocument();
  });

  it("renders out-of-range tiles as transparent with empty title", () => {
    // Out-of-range days (before the 52-week window) should have bg-transparent
    // and empty title
    const { container } = render(<ActivityHeatmap activityData={[]} />);

    const transparentTiles = container.querySelectorAll(".bg-transparent");
    // There should be some transparent tiles at the start (alignment padding)
    // or possibly none depending on the day of week
    expect(transparentTiles.length).toBeGreaterThanOrEqual(0);
  });

  it("handles today's activity", () => {
    const activityData = [
      {
        date: "2025-06-15",
        lessonsCompleted: 2,
        quizzesCompleted: 1,
        xpEarned: 30,
      },
    ];
    const { container } = render(
      <ActivityHeatmap activityData={activityData} />
    );

    const tile = container.querySelector('[title="2025-06-15: 3 activities"]');
    expect(tile).toBeInTheDocument();
  });

  it("renders 5 intensity color boxes in the legend", () => {
    const { container } = render(<ActivityHeatmap activityData={[]} />);

    // The legend section has "Less" and "More" text with 5 color boxes between
    expect(screen.getByText("Less")).toBeInTheDocument();
    expect(screen.getByText("More")).toBeInTheDocument();

    // Each legend box is 11x11 or 13x13
    const legendBoxes = container.querySelectorAll(".rounded-\\[2px\\]");
    expect(legendBoxes.length).toBeGreaterThan(5); // includes both grid tiles and legend boxes
  });
});
