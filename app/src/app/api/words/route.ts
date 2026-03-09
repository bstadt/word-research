import { NextRequest, NextResponse } from "next/server";
import { getUser, getAnonymousId } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getUser();
  const anonymousId = user ? null : await getAnonymousId();

  const { word, definition, subculture, lat, lng, locType, ip: clientIp } = await req.json();

  const ip =
    clientIp ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  if (!word || typeof word !== "string" || word.trim().length === 0) {
    return NextResponse.json({ error: "Word is required" }, { status: 400 });
  }

  const normalized = word.trim().toLowerCase();

  const db = getDb();
  db.prepare(
    `INSERT INTO words (word, definition, subculture, lat, lng, loc_type, user_id, anonymous_id, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    normalized,
    definition || null,
    subculture || null,
    lat || null,
    lng || null,
    locType || null,
    user?.id || null,
    anonymousId,
    ip
  );

  return NextResponse.json({ success: true, word: normalized });
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  const anonymousId = user ? null : await getAnonymousId();

  const db = getDb();

  const words = user
    ? db
        .prepare(
          `SELECT word, definition, subculture, created_at
           FROM words WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
        )
        .all(user.id)
    : db
        .prepare(
          `SELECT word, definition, subculture, created_at
           FROM words WHERE anonymous_id = ? ORDER BY created_at DESC LIMIT 50`
        )
        .all(anonymousId);

  return NextResponse.json({ words });
}
