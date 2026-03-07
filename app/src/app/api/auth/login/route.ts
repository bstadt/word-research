import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyGoogleToken } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { credential } = await req.json();
  if (!credential) {
    return NextResponse.json({ error: "Missing credential" }, { status: 400 });
  }

  const user = await verifyGoogleToken(credential);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Upsert user
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users WHERE id = ?")
    .get(user.id) as { id: string } | undefined;
  if (!existing) {
    db.prepare(
      "INSERT INTO users (id, email, name, image) VALUES (?, ?, ?, ?)"
    ).run(user.id, user.email, user.name, user.image);
  }

  const dbUser = db
    .prepare("SELECT subcultures, score FROM users WHERE id = ?")
    .get(user.id) as { subcultures: string | null; score: number };

  // Set httpOnly cookie with the Google ID token
  const cookieStore = await cookies();
  cookieStore.set("id_token", credential, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hour (matches Google ID token expiry)
    path: "/",
  });

  return NextResponse.json({
    user: { ...user, subcultures: dbUser.subcultures, score: dbUser.score },
  });
}
