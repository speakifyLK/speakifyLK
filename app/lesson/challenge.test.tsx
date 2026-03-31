import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./card", () => ({
  Card: ({
    id,
    text,
    shortcut,
    selected,
    status,
    disabled,
    type,
    onClick,
  }: any) => (
    <div
      data-testid={`card-${id}`}
      data-text={text}
      data-shortcut={shortcut}
      data-selected={selected}
      data-status={status}
      data-disabled={disabled}
      data-type={type}
      onClick={onClick}
    >
      {text}
    </div>
  ),
}));

import { Challenge } from "./challenge";

const options = [
  {
    id: 1,
    challengeId: 10,
    text: "ආයුබෝවන්",
    correct: true,
    imageSrc: "/img1.png",
    audioSrc: "/audio1.mp3",
  },
  {
    id: 2,
    challengeId: 10,
    text: "ස්තුතියි",
    correct: false,
    imageSrc: null,
    audioSrc: null,
  },
  {
    id: 3,
    challengeId: 10,
    text: "සමාවෙන්න",
    correct: false,
    imageSrc: null,
    audioSrc: null,
  },
];

describe("Challenge", () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all option cards", () => {
    render(
      <Challenge
        options={options}
        onSelect={onSelect}
        status="none"
        type="SELECT"
      />
    );
    expect(screen.getByTestId("card-1")).toBeInTheDocument();
    expect(screen.getByTestId("card-2")).toBeInTheDocument();
    expect(screen.getByTestId("card-3")).toBeInTheDocument();
  });

  it("passes correct shortcut numbers to cards", () => {
    render(
      <Challenge
        options={options}
        onSelect={onSelect}
        status="none"
        type="SELECT"
      />
    );
    expect(screen.getByTestId("card-1")).toHaveAttribute("data-shortcut", "1");
    expect(screen.getByTestId("card-2")).toHaveAttribute("data-shortcut", "2");
    expect(screen.getByTestId("card-3")).toHaveAttribute("data-shortcut", "3");
  });

  it("marks the selected option", () => {
    render(
      <Challenge
        options={options}
        onSelect={onSelect}
        status="none"
        selectedOption={2}
        type="SELECT"
      />
    );
    expect(screen.getByTestId("card-1")).toHaveAttribute(
      "data-selected",
      "false"
    );
    expect(screen.getByTestId("card-2")).toHaveAttribute(
      "data-selected",
      "true"
    );
  });

  it("passes status to cards", () => {
    render(
      <Challenge
        options={options}
        onSelect={onSelect}
        status="correct"
        selectedOption={1}
        type="SELECT"
      />
    );
    expect(screen.getByTestId("card-1")).toHaveAttribute(
      "data-status",
      "correct"
    );
  });

  it("passes disabled to cards", () => {
    render(
      <Challenge
        options={options}
        onSelect={onSelect}
        status="none"
        disabled={true}
        type="SELECT"
      />
    );
    expect(screen.getByTestId("card-1")).toHaveAttribute(
      "data-disabled",
      "true"
    );
  });

  it("calls onSelect with the card id when card is clicked", () => {
    render(
      <Challenge
        options={options}
        onSelect={onSelect}
        status="none"
        type="SELECT"
      />
    );
    screen.getByTestId("card-2").click();
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("renders grid-cols-1 for ASSIST type", () => {
    const { container } = render(
      <Challenge
        options={options}
        onSelect={onSelect}
        status="none"
        type="ASSIST"
      />
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("grid-cols-1");
  });

  it("renders grid-cols-2 for SELECT type", () => {
    const { container } = render(
      <Challenge
        options={options}
        onSelect={onSelect}
        status="none"
        type="SELECT"
      />
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("grid-cols-2");
  });

  it("passes type to each card", () => {
    render(
      <Challenge
        options={options}
        onSelect={onSelect}
        status="none"
        type="ASSIST"
      />
    );
    expect(screen.getByTestId("card-1")).toHaveAttribute("data-type", "ASSIST");
    expect(screen.getByTestId("card-2")).toHaveAttribute("data-type", "ASSIST");
  });
});
