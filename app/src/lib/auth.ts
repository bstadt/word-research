import { OAuth2Client } from "google-auth-library";
import { cookies } from "next/headers";
import { getDb } from "./db";

const client = new OAuth2Client(process.env.AUTH_GOOGLE_ID);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image: string;
}

export async function verifyGoogleToken(
  idToken: string
): Promise<AuthUser | null> {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.AUTH_GOOGLE_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) return null;

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name ?? "",
      image: payload.picture ?? "",
    };
  } catch {
    return null;
  }
}

export async function getUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("id_token")?.value;
  if (!token) return null;

  const user = await verifyGoogleToken(token);
  if (!user) return null;

  // Ensure user exists in DB
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users WHERE id = ?")
    .get(user.id) as { id: string } | undefined;
  if (!existing) {
    db.prepare(
      "INSERT INTO users (id, email, name, image) VALUES (?, ?, ?, ?)"
    ).run(user.id, user.email, user.name, user.image);
  }

  return user;
}

export function getUserSubcultures(userId: string): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT subcultures FROM users WHERE id = ?")
    .get(userId) as { subcultures: string | null } | undefined;
  return row?.subcultures ?? null;
}
