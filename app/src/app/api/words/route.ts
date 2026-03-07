import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { word, definition, subculture, lat, lng } = await req.json();

  if (!word || typeof word !== "string" || word.trim().length === 0) {
    return NextResponse.json({ error: "Word is required" }, { status: 400 });
  }

  const normalized = word.trim().toLowerCase();

  const db = getDb();
  db.prepare(
    `INSERT INTO words (word, definition, subculture, lat, lng, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    normalized,
    definition || null,
    subculture || null,
    lat || null,
    lng || null,
    user.id
  );

  return NextResponse.json({ success: true, word: normalized });
}

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const words = db
    .prepare(
      `SELECT word, definition, subculture, created_at
       FROM words WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    )
    .all(user.id);

  return NextResponse.json({ words });
}
