"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Onboarding() {
  const router = useRouter();
  const [subcultures, setSubcultures] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (!data.user) {
          router.push("/");
        } else if (data.user.subcultures) {
          router.push("/");
        } else {
          setAuthed(true);
        }
      }
      setLoading(false);
    }
    check();
  }, [router]);

  if (loading || !authed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground/60">Loading...</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subcultures.trim() || submitting) return;

    setSubmitting(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subcultures: subcultures.trim() }),
    });

    if (res.ok) {
      router.push("/");
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 max-w-lg mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Welcome to Word Research</h1>
        <p className="text-foreground/60">
          What subcultures are you plugged into? This helps us understand where
          words come from.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <textarea
          value={subcultures}
          onChange={(e) => setSubcultures(e.target.value)}
          placeholder='e.g. "sf/ny tech scene, parkour & circus, EA adjacent, memetics research"'
          rows={3}
          autoFocus
          className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-transparent focus:outline-none focus:border-foreground/50 resize-none"
        />
        <button
          type="submit"
          disabled={!subcultures.trim() || submitting}
          className="w-full py-3 rounded-lg bg-foreground text-background font-medium disabled:opacity-40 hover:opacity-90 transition cursor-pointer"
        >
          {submitting ? "..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
