import { NextRequest, NextResponse } from "next/server";

import { getQuizSessionWithQuestions } from "@/db/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionIdParam = searchParams.get("sessionId");

  if (!sessionIdParam) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const sessionId = Number.parseInt(sessionIdParam, 10);
  if (Number.isNaN(sessionId) || sessionId <= 0) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
  }

  const session = await getQuizSessionWithQuestions(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}
