import { NextRequest, NextResponse } from "next/server";
import { fetchRadarItems, sortRadar, type RadarTab } from "@/lib/radar";

export const revalidate = 45;

export async function GET(req: NextRequest) {
  const tabParam = (req.nextUrl.searchParams.get("tab") || "radar").toLowerCase();
  const tab: RadarTab =
    tabParam === "fresh" || tabParam === "fading" ? tabParam : "radar";
  const limit = Math.min(
    50,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") || 30))
  );

  try {
    const items = await fetchRadarItems();
    const sorted = sortRadar(items, tab).slice(0, limit);
    return NextResponse.json(
      {
        tab,
        count: sorted.length,
        items: sorted,
        updated_at: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=45, stale-while-revalidate=90",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { tab, count: 0, items: [], updated_at: new Date().toISOString() },
      { status: 200 }
    );
  }
}
