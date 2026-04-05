import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

import { QuestionBubble } from "./question-bubble";

describe("QuestionBubble", () => {
  it("renders the question text", () => {
    render(<QuestionBubble question="What is 'hello' in Sinhala?" />);
    expect(screen.getByText("What is 'hello' in Sinhala?")).toBeInTheDocument();
  });

  it("renders the mascot images", () => {
    render(<QuestionBubble question="Test question" />);
    const mascots = screen.getAllByAltText("Mascot");
    expect(mascots).toHaveLength(2); // desktop + mobile
    mascots.forEach((img) => {
      expect(img).toHaveAttribute("src", "/mascot.svg");
    });
  });

  it("renders a Sinhala question correctly", () => {
    render(<QuestionBubble question="මෙම වචනයේ තේරුම කුමක්ද?" />);
    expect(screen.getByText("මෙම වචනයේ තේරුම කුමක්ද?")).toBeInTheDocument();
  });

  it("renders the speech bubble arrow", () => {
    const { container } = render(<QuestionBubble question="Test" />);
    const arrow = container.querySelector("[aria-hidden]");
    expect(arrow).toBeInTheDocument();
  });
});
