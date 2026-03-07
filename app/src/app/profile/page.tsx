"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  image: string;
  subcultures: string | null;
}

interface LeaderboardEntry {
  name: string;
  image: string;
  score: number;
}

interface MyStats {
  score: number;
  scored_at: string | null;
  rank: number;
}

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [userRes, lbRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/leaderboard"),
      ]);
      if (userRes.ok) {
        const data = await userRes.json();
        if (!data.user) {
          router.push("/");
          return;
        }
        setUser(data.user);
      }
      if (lbRes.ok) {
        const data = await lbRes.json();
        setLeaderboard(data.leaderboard);
        setMe(data.me);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground/60">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <header className="flex items-center justify-between p-4 border-b border-foreground/10">
        <button
          onClick={() => router.push("/")}
          className="text-sm text-foreground/60 hover:text-foreground transition cursor-pointer"
        >
          &larr; Back
        </button>
        <h1 className="font-bold">Profile</h1>
        <button
          onClick={handleSignOut}
          className="text-sm text-foreground/60 hover:text-foreground transition cursor-pointer"
        >
          Sign out
        </button>
      </header>

      <main className="p-4 space-y-6">
        <div className="flex items-center gap-4">
          {user.image && (
            <img
              src={user.image}
              alt=""
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-foreground/60">{user.email}</p>
          </div>
        </div>

        {me && (
          <div className="p-4 rounded-lg bg-foreground/5">
            <div className="flex justify-between items-baseline">
              <div>
                <p className="text-2xl font-bold">{me.score.toFixed(1)}</p>
                <p className="text-xs text-foreground/50">points</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">#{me.rank}</p>
                <p className="text-xs text-foreground/50">rank</p>
              </div>
            </div>
            {me.scored_at && (
              <p className="text-xs text-foreground/40 mt-2">
                Last scored: {new Date(me.scored_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        <div>
          <h2 className="font-medium mb-1">Daily Leaderboard</h2>
          <p className="text-xs text-foreground/40 mb-3">
            Scores are recalculated every night at midnight. You get points for
            spotting words early that others later log too.
          </p>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-foreground/50">
              No scores yet. Keep logging words!
            </p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/5"
                >
                  <span className="text-sm text-foreground/40 w-6">
                    {i + 1}
                  </span>
                  {entry.image && (
                    <img
                      src={entry.image}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="flex-1 text-sm">{entry.name}</span>
                  <span className="text-sm font-medium">
                    {entry.score.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-foreground/40 pt-4 border-t border-foreground/10">
          <p>Subcultures: {user.subcultures || "Not set"}</p>
        </div>
      </main>
    </div>
  );
}
