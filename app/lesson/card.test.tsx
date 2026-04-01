import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: ({ fill, priority, ...props }: any) => <img {...props} />,
}));

vi.mock("react-use", () => ({
  useAudio: () => {
    const audio = <span data-testid="audio-element" />;
    const state = {};
    const controls = { play: vi.fn().mockResolvedValue(undefined) };
    return [audio, state, controls];
  },
  useKey: (_key: string, _fn: () => void) => {
    // no-op in tests; we test keyboard via fireEvent
  },
}));

import { Card } from "./card";

const baseProps = {
  id: 1,
  text: "ආයුබෝවන්",
  imageSrc: null as string | null,
  audioSrc: null as string | null,
  shortcut: "1",
  selected: false,
  onClick: vi.fn(),
  status: "none" as const,
  disabled: false,
  type: "SELECT" as const,
};

describe("Card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseProps.onClick = vi.fn();
  });

  it("renders the text", () => {
    render(<Card {...baseProps} />);
    expect(screen.getByText("ආයුබෝවන්")).toBeInTheDocument();
  });

  it("renders the shortcut", () => {
    render(<Card {...baseProps} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    render(<Card {...baseProps} />);
    const card = screen.getByText("ආයුබෝවන්").closest("div[class]")!;
    fireEvent.click(card);
    expect(baseProps.onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    render(<Card {...baseProps} disabled={true} />);
    const card = screen.getByText("ආයුබෝවන්").closest("div[class]")!;
    fireEvent.click(card);
    expect(baseProps.onClick).not.toHaveBeenCalled();
  });

  it("renders image when imageSrc is provided", () => {
    render(<Card {...baseProps} imageSrc="/test.png" />);
    const img = screen.getByAltText("ආයුබෝවන්");
    expect(img).toBeInTheDocument();
  });

  it("does not render image when imageSrc is null", () => {
    render(<Card {...baseProps} />);
    expect(screen.queryByAltText("ආයුබෝවන්")).not.toBeInTheDocument();
  });

  it("renders audio element when audioSrc is provided", () => {
    render(<Card {...baseProps} audioSrc="/test-audio.mp3" />);
    expect(screen.getByTestId("audio-element")).toBeInTheDocument();
  });

  it("does not render audio element when audioSrc is null", () => {
    render(<Card {...baseProps} audioSrc={null} />);
    expect(screen.queryByTestId("audio-element")).not.toBeInTheDocument();
  });

  it("applies sky styles when selected and status is none", () => {
    const { container } = render(
      <Card {...baseProps} selected={true} status="none" />
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("border-sky-300");
    expect(outer.className).toContain("bg-sky-100");
  });

  it("applies green styles when selected and status is correct", () => {
    const { container } = render(
      <Card {...baseProps} selected={true} status="correct" />
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("border-green-300");
  });

  it("applies rose styles when selected and status is wrong", () => {
    const { container } = render(
      <Card {...baseProps} selected={true} status="wrong" />
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("border-rose-300");
  });

  it("applies ASSIST-specific layout when type is ASSIST", () => {
    const { container } = render(<Card {...baseProps} type="ASSIST" />);
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("w-full");
  });

  it("applies pointer-events-none when disabled", () => {
    const { container } = render(<Card {...baseProps} disabled={true} />);
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("pointer-events-none");
  });

  it("renders text with sky color when selected", () => {
    render(<Card {...baseProps} selected={true} status="none" />);
    const text = screen.getByText("ආයුබෝවන්");
    expect(text.className).toContain("text-sky-500");
  });

  it("renders text with green color when selected and correct", () => {
    render(<Card {...baseProps} selected={true} status="correct" />);
    const text = screen.getByText("ආයුබෝවන්");
    expect(text.className).toContain("text-green-500");
  });

  it("renders text with rose color when selected and wrong", () => {
    render(<Card {...baseProps} selected={true} status="wrong" />);
    const text = screen.getByText("ආයුබෝවන්");
    expect(text.className).toContain("text-rose-500");
  });
});
