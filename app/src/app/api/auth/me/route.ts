import { NextResponse } from "next/server";
import { getUser, getUserSubcultures } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }

  const db = getDb();
  const dbUser = db
    .prepare("SELECT subcultures, score FROM users WHERE id = ?")
    .get(user.id) as { subcultures: string | null; score: number };

  return NextResponse.json({
    user: { ...user, subcultures: dbUser.subcultures, score: dbUser.score },
  });
}
