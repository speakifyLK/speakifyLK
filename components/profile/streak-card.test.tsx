import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StreakCard } from "./streak-card";

describe("StreakCard", () => {
  it("renders current streak", () => {
    render(
      <StreakCard currentStreak={7} longestStreak={14} totalActiveDays={30} />
    );
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Day streak")).toBeInTheDocument();
  });

  it("renders longest streak", () => {
    render(
      <StreakCard currentStreak={7} longestStreak={14} totalActiveDays={30} />
    );
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("Longest streak")).toBeInTheDocument();
  });

  it("renders total active days", () => {
    render(
      <StreakCard currentStreak={7} longestStreak={14} totalActiveDays={30} />
    );
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("Active days")).toBeInTheDocument();
  });

  it("renders zero values", () => {
    render(
      <StreakCard currentStreak={0} longestStreak={0} totalActiveDays={0} />
    );
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBe(3);
  });

  it("renders all three cards in the grid", () => {
    const { container } = render(
      <StreakCard currentStreak={5} longestStreak={10} totalActiveDays={20} />
    );
    const cards = container.querySelectorAll(".rounded-xl");
    expect(cards.length).toBe(3);
  });
});
