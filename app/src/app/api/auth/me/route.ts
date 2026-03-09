import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }

  const db = getDb();
  const dbUser = db
    .prepare("SELECT score FROM users WHERE id = ?")
    .get(user.id) as { score: number };

  return NextResponse.json({
    user: { ...user, score: dbUser.score },
  });
}
