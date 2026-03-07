import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subcultures } = await req.json();

  if (!subcultures || typeof subcultures !== "string") {
    return NextResponse.json(
      { error: "Subcultures required" },
      { status: 400 }
    );
  }

  const db = getDb();
  db.prepare("UPDATE users SET subcultures = ? WHERE id = ?").run(
    subcultures.trim(),
    user.id
  );

  return NextResponse.json({ success: true });
}
