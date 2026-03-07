import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  const leaderboard = db
    .prepare(
      `SELECT name, image, score FROM users
       WHERE score > 0 ORDER BY score DESC LIMIT 50`
    )
    .all();

  const me = db
    .prepare("SELECT score, scored_at FROM users WHERE id = ?")
    .get(user.id) as { score: number; scored_at: string | null };

  const rank = db
    .prepare("SELECT COUNT(*) as rank FROM users WHERE score > ?")
    .get(me.score) as { rank: number };

  return NextResponse.json({
    leaderboard,
    me: { score: me.score, scored_at: me.scored_at, rank: rank.rank + 1 },
  });
}
