import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("id_token");
}

export async function POST() {
  await logout();
  return NextResponse.json({ success: true });
}

export async function GET() {
  await logout();
  return NextResponse.redirect(new URL("/", process.env.AUTH_URL || "http://localhost:3000"));
}
