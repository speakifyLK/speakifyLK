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

  const filter = filterParam ? JSON.parse(filterParam) : {};

  // Handle getMany requests (filter by IDs)
  if (filter.id && Array.isArray(filter.id)) {
    const data = await db.query.units.findMany({
      where: inArray(units.id, filter.id),
    });
    return NextResponse.json(data, {
      headers: {
        "Content-Range": `units 0-${data.length}/${data.length}`,
      },
    });
  }

  const allData = await db.query.units.findMany();
  const total = allData.length;

  // Handle getList requests (with pagination)
  if (rangeParam) {
    const [start, end] = JSON.parse(rangeParam) as [number, number];
    const paginatedData = allData.slice(start, end + 1);
    return NextResponse.json(paginatedData, {
      headers: {
        "Content-Range": `units ${start}-${start + paginatedData.length - 1}/${total}`,
      },
    });
  }

  return NextResponse.json(allData, {
    headers: {
      "Content-Range": `units 0-${total - 1}/${total}`,
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
