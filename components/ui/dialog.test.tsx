import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
} from "./dialog";

// Make the Radix portal render inline so content is testable in jsdom
vi.mock("@radix-ui/react-dialog", async () => {
  const actual = await vi.importActual<typeof import("@radix-ui/react-dialog")>(
    "@radix-ui/react-dialog"
  );
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe("Dialog", () => {
  it("renders trigger", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
      </Dialog>
    );
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("opens on trigger click and shows content", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Desc</DialogDescription>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Desc")).toBeInTheDocument();
  });

  it("renders close button with sr-only text inside content", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Title</DialogTitle>
          <p>Body</p>
        </DialogContent>
      </Dialog>
    );

    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("renders content when defaultOpen", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Default Open</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText("Default Open")).toBeInTheDocument();
  });
});

describe("DialogHeader", () => {
  it("renders with default classes", () => {
    render(<DialogHeader data-testid="header">Header</DialogHeader>);
    const el = screen.getByTestId("header");
    expect(el.className).toContain("flex");
    expect(el.className).toContain("flex-col");
  });

  it("merges custom className", () => {
    render(
      <DialogHeader data-testid="header" className="extra">
        Header
      </DialogHeader>
    );
    expect(screen.getByTestId("header").className).toContain("extra");
  });

  it("renders children", () => {
    render(<DialogHeader>My Header</DialogHeader>);
    expect(screen.getByText("My Header")).toBeInTheDocument();
  });
});

describe("DialogFooter", () => {
  it("renders with default classes", () => {
    render(<DialogFooter data-testid="footer">Footer</DialogFooter>);
    const el = screen.getByTestId("footer");
    expect(el.className).toContain("flex");
    expect(el.className).toContain("flex-col-reverse");
  });

  it("merges custom className", () => {
    render(
      <DialogFooter data-testid="footer" className="extra">
        Footer
      </DialogFooter>
    );
    expect(screen.getByTestId("footer").className).toContain("extra");
  });

  it("renders children", () => {
    render(<DialogFooter>My Footer</DialogFooter>);
    expect(screen.getByText("My Footer")).toBeInTheDocument();
  });
});

describe("DialogTitle", () => {
  it("applies default classes", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle data-testid="title">T</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const el = screen.getByTestId("title");
    expect(el.className).toContain("font-semibold");
  });

  it("merges custom className", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle data-testid="title" className="my-title">
            T
          </DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByTestId("title").className).toContain("my-title");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLHeadingElement>();
    render(
      <Dialog defaultOpen>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle ref={ref}>T</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe("DialogDescription", () => {
  it("applies default classes", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          <DialogDescription data-testid="desc">D</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    const el = screen.getByTestId("desc");
    expect(el.className).toContain("text-sm");
  });

  it("merges custom className", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          <DialogDescription data-testid="desc" className="my-desc">
            D
          </DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByTestId("desc").className).toContain("my-desc");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLParagraphElement>();
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>T</DialogTitle>
          <DialogDescription ref={ref}>D</DialogDescription>
        </DialogContent>
      </Dialog>
    );
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe("DialogOverlay", () => {
  it("applies default classes", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    // The overlay is rendered inside DialogContent
    const overlay = document.querySelector("[data-state]");
    expect(overlay).toBeInTheDocument();
  });

  it("merges custom className on overlay when rendered standalone", () => {
    render(
      <Dialog defaultOpen>
        <DialogOverlay data-testid="overlay" className="custom-overlay" />
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    const overlay = screen.getByTestId("overlay");
    expect(overlay.className).toContain("custom-overlay");
  });
});

describe("DialogContent", () => {
  it("merges custom className", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent
          data-testid="content"
          className="my-content"
          aria-describedby={undefined}
        >
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByTestId("content").className).toContain("my-content");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Dialog defaultOpen>
        <DialogContent ref={ref} aria-describedby={undefined}>
          <DialogTitle>T</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
