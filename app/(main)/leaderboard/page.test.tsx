import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockRedirect = vi.hoisted(() =>
  vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  })
);
const mockGetUserProgress = vi.hoisted(() => vi.fn());
const mockGetUserSubscription = vi.hoisted(() => vi.fn());
const mockGetTopTenUsers = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/db/queries", () => ({
  getUserProgress: mockGetUserProgress,
  getUserSubscription: mockGetUserSubscription,
  getTopTenUsers: mockGetTopTenUsers,
}));

vi.mock("@/components/feed-wrapper", () => ({
  FeedWrapper: ({ children }: any) => (
    <div data-testid="feed-wrapper">{children}</div>
  ),
}));
vi.mock("@/components/sticky-wrapper", () => ({
  StickyWrapper: ({ children }: any) => (
    <div data-testid="sticky-wrapper">{children}</div>
  ),
}));
vi.mock("@/components/user-progress", () => ({
  UserProgress: (props: any) => (
    <div data-testid="user-progress">{JSON.stringify(props)}</div>
  ),
}));
vi.mock("@/components/promo", () => ({
  Promo: () => <div data-testid="promo">Promo</div>,
}));
vi.mock("@/components/quests", () => ({
  Quests: ({ points }: any) => <div data-testid="quests">Quests: {points}</div>,
}));
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: any) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src }: any) => <img data-testid="avatar-image" src={src} />,
}));
vi.mock("@/components/ui/separator", () => ({
  Separator: (props: any) => (
    <hr data-testid="separator" className={props.className} />
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

describe("LeaderboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("redirects to /courses when no user progress", async () => {
    mockGetUserProgress.mockResolvedValue(null);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetTopTenUsers.mockResolvedValue([]);

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
    mockGetTopTenUsers.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    await expect(Page()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/courses");
  });

  it("renders leaderboard with users", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetTopTenUsers.mockResolvedValue([
      {
        userId: "u1",
        userName: "Alice",
        userImageSrc: "/alice.svg",
        points: 200,
      },
      { userId: "u2", userName: "Bob", userImageSrc: "/bob.svg", points: 150 },
    ]);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("200 XP")).toBeInTheDocument();
    expect(screen.getByText("150 XP")).toBeInTheDocument();
  });

  it("renders correct rank numbers", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetTopTenUsers.mockResolvedValue([
      {
        userId: "u1",
        userName: "Alice",
        userImageSrc: "/alice.svg",
        points: 200,
      },
      { userId: "u2", userName: "Bob", userImageSrc: "/bob.svg", points: 150 },
    ]);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows Promo when user is not pro", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetTopTenUsers.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByTestId("promo")).toBeInTheDocument();
  });

  it("does not show Promo when user is pro", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue({ isActive: true });
    mockGetTopTenUsers.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.queryByTestId("promo")).not.toBeInTheDocument();
  });

  it("renders leaderboard image", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetTopTenUsers.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByAltText("Leaderboard")).toBeInTheDocument();
  });

  it("renders description text", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetTopTenUsers.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(
      screen.getByText(
        "See where you stand among other learners in the community."
      )
    ).toBeInTheDocument();
  });

  it("renders empty leaderboard", async () => {
    mockGetUserProgress.mockResolvedValue(baseUserProgress);
    mockGetUserSubscription.mockResolvedValue(null);
    mockGetTopTenUsers.mockResolvedValue([]);

    const Page = (await import("./page")).default;
    const jsx = await Page();
    render(jsx);

    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    expect(screen.getByTestId("separator")).toBeInTheDocument();
  });
});
