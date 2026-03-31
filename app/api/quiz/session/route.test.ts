import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetQuizSessionWithQuestions = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: mockAuth }));
vi.mock("@/db/queries", () => ({
  getQuizSessionWithQuestions: mockGetQuizSessionWithQuestions,
}));

import { GET } from "./route";

describe("GET /api/quiz/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new NextRequest(
      "http://localhost/api/quiz/session?sessionId=1"
    );
    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when sessionId is missing", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const request = new NextRequest("http://localhost/api/quiz/session");
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Missing sessionId" });
  });

  it("returns 400 when sessionId is NaN", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const request = new NextRequest(
      "http://localhost/api/quiz/session?sessionId=abc"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid sessionId" });
  });

  it("returns 400 when sessionId is 0", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const request = new NextRequest(
      "http://localhost/api/quiz/session?sessionId=0"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid sessionId" });
  });

  it("returns 400 when sessionId is negative", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const request = new NextRequest(
      "http://localhost/api/quiz/session?sessionId=-5"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid sessionId" });
  });

  it("returns 404 when session not found", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetQuizSessionWithQuestions.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/quiz/session?sessionId=999"
    );
    const response = await GET(request);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Session not found" });
    expect(mockGetQuizSessionWithQuestions).toHaveBeenCalledWith(999);
  });

  it("returns 200 with session data", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const mockSession = {
      id: 1,
      userId: "user_123",
      questions: [
        { id: 1, text: "What is 1+1?", answer: "2" },
        { id: 2, text: "What is 2+2?", answer: "4" },
      ],
    };
    mockGetQuizSessionWithQuestions.mockResolvedValue(mockSession);

    const request = new NextRequest(
      "http://localhost/api/quiz/session?sessionId=1"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(mockSession);
    expect(mockGetQuizSessionWithQuestions).toHaveBeenCalledWith(1);
  });
});
