import { describe, it, expect, vi } from "vitest";
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
vi.mock("@/components/promo", () => ({
  Promo: () => <div data-testid="promo">Promo</div>,
}));
vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value, className }: any) => (
    <div data-testid="progress-bar" data-value={value} className={className} />
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

describe("QuestsPage", () => {
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

  it("renders quests page with quest items", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Quests")).toBeInTheDocument();
    expect(screen.getByText("Complete quests by earning points.")).toBeInTheDocument();
    expect(screen.getByAltText("Quests")).toBeInTheDocument();
  });

  it("renders all QUESTS from constants", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Earn 20 XP")).toBeInTheDocument();
    expect(screen.getByText("Earn 50 XP")).toBeInTheDocument();
    expect(screen.getByText("Earn 100 XP")).toBeInTheDocument();
    expect(screen.getByText("Earn 250 XP")).toBeInTheDocument();
    expect(screen.getByText("Earn 500 XP")).toBeInTheDocument();
    expect(screen.getByText("Earn 1000 XP")).toBeInTheDocument();
  });

  it("renders progress bars for quests", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    const progressBars = screen.getAllByTestId("progress-bar");
    expect(progressBars.length).toBe(6); // 6 quests
  });

  it("shows Promo when user is not pro", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("promo")).toBeInTheDocument();
  });

  it("does not show Promo when user is pro", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue({ isActive: true });

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.queryByTestId("promo")).not.toBeInTheDocument();
  });

  it("calculates correct progress values", async () => {
    // 100 points / 20 value * 100 = 500%
    mockGetUserProgress.mockResolvedValue({ ...baseUserProgress, points: 10 });
    mockGetUserSubscription.mockResolvedValue(null);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    const progressBars = screen.getAllByTestId("progress-bar");
    // 10/20 * 100 = 50
    expect(progressBars[0]).toHaveAttribute("data-value", "50");
    // 10/50 * 100 = 20
    expect(progressBars[1]).toHaveAttribute("data-value", "20");
  });
});
