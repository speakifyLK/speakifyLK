import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetOverlay,
  SheetClose,
  SheetPortal,
} from "./sheet";

// Make Radix portal render inline for testing
vi.mock("@radix-ui/react-dialog", async () => {
  const actual =
    await vi.importActual<typeof import("@radix-ui/react-dialog")>("@radix-ui/react-dialog");
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

describe("Sheet", () => {
  it("renders trigger", () => {
    render(
      <Sheet>
        <SheetTrigger>Open Sheet</SheetTrigger>
      </Sheet>
    );
    expect(screen.getByText("Open Sheet")).toBeInTheDocument();
  });

  it("opens on trigger click and shows content", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Sheet Title</SheetTitle>
          <SheetDescription>Sheet Desc</SheetDescription>
        </SheetContent>
      </Sheet>
    );

    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Sheet Title")).toBeInTheDocument();
    expect(screen.getByText("Sheet Desc")).toBeInTheDocument();
  });

  it("renders close button inside content", async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
        </SheetContent>
      </Sheet>
    );

    await user.click(screen.getByText("Open"));
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("renders content when defaultOpen", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle>Default Sheet</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByText("Default Sheet")).toBeInTheDocument();
  });
});

describe("SheetContent variants (side)", () => {
  const sides = ["top", "bottom", "left", "right"] as const;

  sides.forEach((side) => {
    it(`renders with side="${side}"`, () => {
      render(
        <Sheet defaultOpen>
          <SheetContent side={side} data-testid="content">
            <SheetTitle>T</SheetTitle>
          </SheetContent>
        </Sheet>
      );
      expect(screen.getByTestId("content")).toBeInTheDocument();
    });
  });

  it("merges custom className on content", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent data-testid="content" className="my-sheet">
          <SheetTitle>T</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByTestId("content").className).toContain("my-sheet");
  });

  it("forwards ref on content", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Sheet defaultOpen>
        <SheetContent ref={ref}>
          <SheetTitle>T</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("SheetHeader", () => {
  it("renders with default classes", () => {
    render(<SheetHeader data-testid="header">Header</SheetHeader>);
    const el = screen.getByTestId("header");
    expect(el.className).toContain("flex");
    expect(el.className).toContain("flex-col");
  });

  it("merges custom className", () => {
    render(
      <SheetHeader data-testid="header" className="extra">
        Header
      </SheetHeader>
    );
    expect(screen.getByTestId("header").className).toContain("extra");
  });

  it("renders children", () => {
    render(<SheetHeader>My Header</SheetHeader>);
    expect(screen.getByText("My Header")).toBeInTheDocument();
  });
});

describe("SheetFooter", () => {
  it("renders with default classes", () => {
    render(<SheetFooter data-testid="footer">Footer</SheetFooter>);
    const el = screen.getByTestId("footer");
    expect(el.className).toContain("flex");
    expect(el.className).toContain("flex-col-reverse");
  });

  it("merges custom className", () => {
    render(
      <SheetFooter data-testid="footer" className="extra">
        Footer
      </SheetFooter>
    );
    expect(screen.getByTestId("footer").className).toContain("extra");
  });

  it("renders children", () => {
    render(<SheetFooter>My Footer</SheetFooter>);
    expect(screen.getByText("My Footer")).toBeInTheDocument();
  });
});

describe("SheetTitle", () => {
  it("applies default classes", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle data-testid="title">T</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    const el = screen.getByTestId("title");
    expect(el.className).toContain("font-semibold");
  });

  it("merges custom className", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle data-testid="title" className="my-title">
            T
          </SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByTestId("title").className).toContain("my-title");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLHeadingElement>();
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle ref={ref}>T</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe("SheetDescription", () => {
  it("applies default classes", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle>T</SheetTitle>
          <SheetDescription data-testid="desc">D</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    const el = screen.getByTestId("desc");
    expect(el.className).toContain("text-sm");
  });

  it("merges custom className", () => {
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle>T</SheetTitle>
          <SheetDescription data-testid="desc" className="my-desc">
            D
          </SheetDescription>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByTestId("desc").className).toContain("my-desc");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLParagraphElement>();
    render(
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle>T</SheetTitle>
          <SheetDescription ref={ref}>D</SheetDescription>
        </SheetContent>
      </Sheet>
    );
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });
});

describe("SheetOverlay", () => {
  it("merges custom className", () => {
    render(
      <Sheet defaultOpen>
        <SheetOverlay data-testid="overlay" className="custom-overlay" />
        <SheetContent>
          <SheetTitle>T</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    const overlay = screen.getByTestId("overlay");
    expect(overlay.className).toContain("custom-overlay");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Sheet defaultOpen>
        <SheetOverlay ref={ref} />
        <SheetContent>
          <SheetTitle>T</SheetTitle>
        </SheetContent>
      </Sheet>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
