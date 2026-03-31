import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/db/schema", () => ({
  lessons: { $inferSelect: {} },
  units: { $inferSelect: {} },
}));

vi.mock("./lesson-button", () => ({
  LessonButton: ({
    id,
    index,
    totalCount,
    current,
    locked,
    percentage,
  }: any) => (
    <div
      data-testid={`lesson-button-${id}`}
      data-current={current}
      data-locked={locked}
      data-index={index}
      data-total={totalCount}
      data-percentage={percentage}
    >
      Lesson {id}
    </div>
  ),
}));

vi.mock("./unit-banner", () => ({
  UnitBanner: ({ title, description }: any) => (
    <div data-testid="unit-banner">
      {title} - {description}
    </div>
  ),
}));

import { Unit } from "./unit";

const lessons = [
  { id: 1, title: "Lesson 1", unitId: 1, order: 1, completed: true },
  { id: 2, title: "Lesson 2", unitId: 1, order: 2, completed: false },
  { id: 3, title: "Lesson 3", unitId: 1, order: 3, completed: false },
];

const activeLesson = {
  id: 2,
  title: "Lesson 2",
  unitId: 1,
  order: 2,
  unit: {
    id: 1,
    title: "Unit 1",
    description: "Basics",
    courseId: 1,
    order: 1,
  },
};

describe("Unit", () => {
  it("renders the UnitBanner with title and description", () => {
    render(
      <Unit
        id={1}
        order={1}
        title="Unit 1"
        description="Learn the basics"
        lessons={lessons}
        activeLesson={activeLesson}
        activeLessonPercentage={50}
      />
    );
    expect(screen.getByTestId("unit-banner")).toHaveTextContent(
      "Unit 1 - Learn the basics"
    );
  });

  it("renders all lesson buttons", () => {
    render(
      <Unit
        id={1}
        order={1}
        title="Unit 1"
        description="Basics"
        lessons={lessons}
        activeLesson={activeLesson}
        activeLessonPercentage={50}
      />
    );
    expect(screen.getByTestId("lesson-button-1")).toBeInTheDocument();
    expect(screen.getByTestId("lesson-button-2")).toBeInTheDocument();
    expect(screen.getByTestId("lesson-button-3")).toBeInTheDocument();
  });

  it("marks the active lesson as current", () => {
    render(
      <Unit
        id={1}
        order={1}
        title="Unit 1"
        description="Basics"
        lessons={lessons}
        activeLesson={activeLesson}
        activeLessonPercentage={50}
      />
    );
    expect(screen.getByTestId("lesson-button-2")).toHaveAttribute(
      "data-current",
      "true"
    );
    expect(screen.getByTestId("lesson-button-1")).toHaveAttribute(
      "data-current",
      "false"
    );
  });

  it("marks completed lessons as not locked", () => {
    render(
      <Unit
        id={1}
        order={1}
        title="Unit 1"
        description="Basics"
        lessons={lessons}
        activeLesson={activeLesson}
        activeLessonPercentage={50}
      />
    );
    // Lesson 1: completed=true, isCurrent=false -> isLocked=false
    expect(screen.getByTestId("lesson-button-1")).toHaveAttribute(
      "data-locked",
      "false"
    );
  });

  it("marks non-completed, non-current lessons as locked", () => {
    render(
      <Unit
        id={1}
        order={1}
        title="Unit 1"
        description="Basics"
        lessons={lessons}
        activeLesson={activeLesson}
        activeLessonPercentage={50}
      />
    );
    // Lesson 3: completed=false, isCurrent=false -> isLocked=true
    expect(screen.getByTestId("lesson-button-3")).toHaveAttribute(
      "data-locked",
      "true"
    );
  });

  it("passes totalCount as lessons.length - 1", () => {
    render(
      <Unit
        id={1}
        order={1}
        title="Unit 1"
        description="Basics"
        lessons={lessons}
        activeLesson={activeLesson}
        activeLessonPercentage={50}
      />
    );
    expect(screen.getByTestId("lesson-button-1")).toHaveAttribute(
      "data-total",
      "2"
    );
  });

  it("passes activeLessonPercentage to all buttons", () => {
    render(
      <Unit
        id={1}
        order={1}
        title="Unit 1"
        description="Basics"
        lessons={lessons}
        activeLesson={activeLesson}
        activeLessonPercentage={75}
      />
    );
    expect(screen.getByTestId("lesson-button-1")).toHaveAttribute(
      "data-percentage",
      "75"
    );
    expect(screen.getByTestId("lesson-button-2")).toHaveAttribute(
      "data-percentage",
      "75"
    );
  });

  it("handles undefined activeLesson", () => {
    render(
      <Unit
        id={1}
        order={1}
        title="Unit 1"
        description="Basics"
        lessons={lessons}
        activeLesson={undefined}
        activeLessonPercentage={0}
      />
    );
    // All non-completed should be locked, none should be current
    expect(screen.getByTestId("lesson-button-2")).toHaveAttribute(
      "data-current",
      "false"
    );
    expect(screen.getByTestId("lesson-button-2")).toHaveAttribute(
      "data-locked",
      "true"
    );
  });
});
