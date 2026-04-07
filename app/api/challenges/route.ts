import { inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import db from "@/db/drizzle";
import { challenges } from "@/db/schema";
import { getIsAdmin } from "@/lib/admin";

export const GET = async (req: NextRequest) => {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return new NextResponse("Unauthorized.", { status: 401 });

  const { searchParams } = req.nextUrl;
  const filterParam = searchParams.get("filter");
  const rangeParam = searchParams.get("range");

  let filter: Record<string, unknown> = {};
  try {
    filter = filterParam ? JSON.parse(filterParam) : {};
  } catch {
    return new NextResponse("Invalid filter parameter.", { status: 400 });
  }

  // Handle getMany requests (filter by IDs)
  if (filter.id && Array.isArray(filter.id)) {
    const data = await db.query.challenges.findMany({
      where: inArray(challenges.id, filter.id as number[]),
    });
    const contentRange =
      data.length > 0 ? `challenges 0-${data.length - 1}/${data.length}` : "challenges */0";
    return NextResponse.json(data, {
      headers: {
        "Content-Range": contentRange,
      },
    });
  }

  const allData = await db.query.challenges.findMany();
  const total = allData.length;

  // Handle getList requests (with pagination)
  if (rangeParam) {
    let start: number;
    let end: number;
    try {
      [start, end] = JSON.parse(rangeParam) as [number, number];
    } catch {
      return new NextResponse("Invalid range parameter.", { status: 400 });
    }
    const paginatedData = allData.slice(start, end + 1);
    const contentRange =
      paginatedData.length > 0
        ? `challenges ${start}-${start + paginatedData.length - 1}/${total}`
        : `challenges */${total}`;
    return NextResponse.json(paginatedData, {
      headers: {
        "Content-Range": contentRange,
      },
    });
  }

  return NextResponse.json(allData, {
    headers: {
      "Content-Range": total > 0 ? `challenges 0-${total - 1}/${total}` : "challenges */0",
    },
  });
};

export const POST = async (req: NextRequest) => {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return new NextResponse("Unauthorized.", { status: 401 });

  const body = (await req.json()) as typeof challenges.$inferSelect;

  const data = await db
    .insert(challenges)
    .values({
      ...body,
    })
    .returning();

  return NextResponse.json(data[0]);
};
