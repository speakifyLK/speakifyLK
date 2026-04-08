import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StatsOverview } from "./stats-overview";

const baseProps = {
  totalXp: 1500,
  totalLessonsCompleted: 42,
  totalQuizzesCompleted: 15,
  averageQuizScore: 78,
  improvementTrend: "stable" as const,
  favouriteTopic: null,
};

describe("StatsOverview", () => {
  it("renders the heading", () => {
    render(<StatsOverview {...baseProps} />);
    expect(screen.getByText("Learning Analytics")).toBeInTheDocument();
  });

  it("renders total XP with locale formatting", () => {
    render(<StatsOverview {...baseProps} />);
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("Total XP")).toBeInTheDocument();
  });

  it("renders lessons completed", () => {
    render(<StatsOverview {...baseProps} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Lessons done")).toBeInTheDocument();
  });

  it("renders quizzes completed", () => {
    render(<StatsOverview {...baseProps} />);
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Quizzes taken")).toBeInTheDocument();
  });

  it("renders average quiz score with percent", () => {
    render(<StatsOverview {...baseProps} />);
    expect(screen.getByText("78%")).toBeInTheDocument();
    expect(screen.getByText("Avg quiz score")).toBeInTheDocument();
  });

  it("renders 'improving' trend", () => {
    render(<StatsOverview {...baseProps} improvementTrend="improving" />);
    expect(screen.getByText("improving")).toBeInTheDocument();
    expect(screen.getByText("Performance")).toBeInTheDocument();
  });

  it("renders 'declining' trend", () => {
    render(<StatsOverview {...baseProps} improvementTrend="declining" />);
    expect(screen.getByText("declining")).toBeInTheDocument();
  });

  it("renders 'stable' trend", () => {
    render(<StatsOverview {...baseProps} improvementTrend="stable" />);
    expect(screen.getByText("stable")).toBeInTheDocument();
  });

  it("renders favourite topic when provided", () => {
    render(<StatsOverview {...baseProps} favouriteTopic="Greetings" />);
    expect(screen.getByText("Greetings")).toBeInTheDocument();
    expect(screen.getByText("Top topic")).toBeInTheDocument();
  });

  it("does not render favourite topic when null", () => {
    render(<StatsOverview {...baseProps} favouriteTopic={null} />);
    expect(screen.queryByText("Top topic")).not.toBeInTheDocument();
  });

  it("renders improving trend with green background", () => {
    const { container } = render(<StatsOverview {...baseProps} improvementTrend="improving" />);
    const greenBg = container.querySelector(".bg-green-100");
    expect(greenBg).toBeInTheDocument();
  });

  it("renders declining trend with rose background", () => {
    const { container } = render(<StatsOverview {...baseProps} improvementTrend="declining" />);
    const roseBg = container.querySelector(".bg-rose-100");
    expect(roseBg).toBeInTheDocument();
  });

  it("renders stable trend with slate background", () => {
    const { container } = render(<StatsOverview {...baseProps} improvementTrend="stable" />);
    const slateBg = container.querySelector(".bg-slate-100");
    expect(slateBg).toBeInTheDocument();
  });
});
