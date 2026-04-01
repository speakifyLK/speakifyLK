import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRedirect = vi.hoisted(() =>
  vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  })
);
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
  getUserSubscription: mockGetUserSubscription,
}));

vi.mock("@/components/feed-wrapper", () => ({
  FeedWrapper: ({ children }: any) => <div data-testid="feed-wrapper">{children}</div>,
}));
vi.mock("@/components/sticky-wrapper", () => ({
  StickyWrapper: ({ children }: any) => <div data-testid="sticky-wrapper">{children}</div>,
}));
vi.mock("@/components/user-progress", () => ({
  UserProgress: (props: any) => <div data-testid="user-progress">{JSON.stringify(props)}</div>,
}));
vi.mock("@/components/quests", () => ({
  Quests: ({ points }: any) => <div data-testid="quests">Quests: {points}</div>,
}));
vi.mock("./items", () => ({
  Items: ({ hearts, points, hasActiveSubscription }: any) => (
    <div
      data-testid="items"
      data-hearts={hearts}
      data-points={points}
      data-pro={hasActiveSubscription}
    >
      Items
    </div>
  ),
}));

const activeCourse = { id: 1, title: "Sinhala", imageSrc: "/sinhala.svg" };

const baseUserProgress = {
  userId: "user_123",
  userName: "Test User",
  userImageSrc: "/mascot.svg",
  activeCourseId: 1,
  hearts: 5,
  points: 100,
  activeCourse,
};

describe("ShopPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("redirects to /courses when no user progress", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("redirects to /courses when no active course", async () => {
    mockGetUserProgress.mockResolvedValue({
      ...baseUserProgress,
      activeCourse: null,
    });
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("renders shop page with items", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Shop")).toBeInTheDocument();
    expect(screen.getByText("Spend your points on cool stuff.")).toBeInTheDocument();
    expect(screen.getByAltText("Shop")).toBeInTheDocument();
    expect(screen.getByTestId("items")).toBeInTheDocument();
  });

  it("passes correct props to Items when not pro", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    const items = screen.getByTestId("items");
    expect(items).toHaveAttribute("data-hearts", "5");
    expect(items).toHaveAttribute("data-points", "100");
    expect(items).toHaveAttribute("data-pro", "false");
  });

  it("passes isPro=true to Items when subscribed", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue({ isActive: true });

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    const items = screen.getByTestId("items");
    expect(items).toHaveAttribute("data-pro", "true");
  });

  it("renders UserProgress and Quests in sticky wrapper", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("user-progress")).toBeInTheDocument();
    expect(screen.getByTestId("quests")).toHaveTextContent("Quests: 100");
  });

  it("renders shop image", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    const img = screen.getByAltText("Shop");
    expect(img).toHaveAttribute("src", "/shop.svg");
  });
});
