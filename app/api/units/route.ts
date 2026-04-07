import { inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import db from "@/db/drizzle";
import { units } from "@/db/schema";
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
    const data = await db.query.units.findMany({
      where: inArray(units.id, filter.id as number[]),
    });
    const contentRange =
      data.length > 0 ? `units 0-${data.length - 1}/${data.length}` : "units */0";
    return NextResponse.json(data, {
      headers: {
        "Content-Range": contentRange,
      },
    });
  }

  const allData = await db.query.units.findMany();

  // Handle search filter from AutocompleteInput (filter by title text)
  const normalizedQuery = typeof filter.q === "string" ? filter.q.trim().toLowerCase() : "";
  const filteredData =
    normalizedQuery !== ""
      ? allData.filter((item) => item.title.toLowerCase().includes(normalizedQuery))
      : allData;
  const total = filteredData.length;

  // Handle getList requests (with pagination)
  if (rangeParam) {
    let start: number;
    let end: number;
    try {
      [start, end] = JSON.parse(rangeParam) as [number, number];
    } catch {
      return new NextResponse("Invalid range parameter.", { status: 400 });
    }
    const paginatedData = filteredData.slice(start, end + 1);
    const contentRange =
      paginatedData.length > 0
        ? `units ${start}-${start + paginatedData.length - 1}/${total}`
        : `units */${total}`;
    return NextResponse.json(paginatedData, {
      headers: {
        "Content-Range": contentRange,
      },
    });
  }

  return NextResponse.json(filteredData, {
    headers: {
      "Content-Range": total > 0 ? `units 0-${total - 1}/${total}` : "units */0",
    },
  });
};

export const POST = async (req: NextRequest) => {
  const isAdmin = await getIsAdmin();
  if (!isAdmin) return new NextResponse("Unauthorized.", { status: 401 });

  const body = (await req.json()) as typeof units.$inferSelect;

  const data = await db
    .insert(units)
    .values({
      ...body,
    })
    .returning();

  return NextResponse.json(data[0]);
};
