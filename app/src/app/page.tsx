"use client";

import { GoogleLogin, useGoogleOneTapLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  image: string;
  subcultures: string | null;
  score: number;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [subculture, setSubculture] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState("");
  const [recentWords, setRecentWords] = useState<
    { word: string; created_at: string }[]
  >([]);

  const fetchUser = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
    setLoading(false);
  }, []);

  const fetchRecent = useCallback(async () => {
    const res = await fetch("/api/words");
    if (res.ok) {
      const data = await res.json();
      setRecentWords(data.words);
    }
  }, []);

  // Silent token refresh every 45 minutes
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  useGoogleOneTapLogin({
    onSuccess: (res) => {
      if (res.credential) handleLogin(res.credential);
    },
    onError: () => {},
    cancel_on_tap_outside: false,
    disabled: !!user,
  });

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user && !user.subcultures) {
      router.push("/onboarding");
    }
    if (user) {
      fetchRecent();

      // Refresh the token silently every 45 min via One Tap
      refreshInterval.current = setInterval(() => {
        const google = (window as any).google;
        if (google?.accounts?.id) {
          google.accounts.id.prompt((notification: any) => {
            // One Tap will silently issue a new credential if the user
            // has an active Google session — the callback in
            // useGoogleOneTapLogin handles it
          });
        }
      }, 45 * 60 * 1000);

      return () => {
        if (refreshInterval.current) clearInterval(refreshInterval.current);
      };
    }
  }, [user, router, fetchRecent]);

  async function handleLogin(credential: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim() || submitting) return;

    setSubmitting(true);

    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 3000,
        })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // location is optional
    }

    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: word.trim(),
        definition: definition.trim() || null,
        subculture: subculture.trim() || null,
        lat,
        lng,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setFlash(`"${data.word}" logged`);
      setWord("");
      setDefinition("");
      setSubculture("");
      setShowOptional(false);
      fetchRecent();
      setTimeout(() => setFlash(""), 2000);
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground/60">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Word Research</h1>
          <p className="text-foreground/60 max-w-md">
            Spot new words before they go mainstream. Like Merlin Bird ID, but
            for language.
          </p>
        </div>
        <GoogleLogin
          onSuccess={(res) => {
            if (res.credential) handleLogin(res.credential);
          }}
          onError={() => console.error("Login failed")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-foreground/10">
        <h1 className="font-bold text-lg">Word Research</h1>
        <button
          onClick={() => router.push("/profile")}
          className="text-sm text-foreground/60 hover:text-foreground transition cursor-pointer"
        >
          {user.name || "Profile"}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-6 max-w-lg mx-auto w-full">
        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <label className="block text-sm text-foreground/60">
            Heard a new word?
          </label>
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Type the word..."
            autoFocus
            className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-transparent text-lg focus:outline-none focus:border-foreground/50"
          />

          {!showOptional && (
            <button
              type="button"
              onClick={() => setShowOptional(true)}
              className="text-sm text-foreground/40 hover:text-foreground/60 transition cursor-pointer"
            >
              + add definition or subculture
            </button>
          )}

          {showOptional && (
            <>
              <input
                type="text"
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="Definition (optional)"
                className="w-full px-4 py-2 rounded-lg border border-foreground/20 bg-transparent text-sm focus:outline-none focus:border-foreground/50"
              />
              <input
                type="text"
                value={subculture}
                onChange={(e) => setSubculture(e.target.value)}
                placeholder="Subculture (optional)"
                className="w-full px-4 py-2 rounded-lg border border-foreground/20 bg-transparent text-sm focus:outline-none focus:border-foreground/50"
              />
            </>
          )}

          <button
            type="submit"
            disabled={!word.trim() || submitting}
            className="w-full py-3 rounded-lg bg-foreground text-background font-medium disabled:opacity-40 hover:opacity-90 transition cursor-pointer"
          >
            {submitting ? "..." : "Log it"}
          </button>
        </form>

        {flash && (
          <p className="text-sm text-green-500 font-medium">{flash}</p>
        )}

        {recentWords.length > 0 && (
          <div className="w-full mt-4">
            <p className="text-xs text-foreground/40 mb-2">Your recent words</p>
            <div className="flex flex-wrap gap-2">
              {recentWords.map((w, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-sm rounded bg-foreground/5 text-foreground/70"
                >
                  {w.word}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
