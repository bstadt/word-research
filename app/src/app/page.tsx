"use client";

import { GoogleLogin, useGoogleOneTapLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  image: string;
  score: number;
}

type LocationStatus = "unknown" | "checking" | "granted" | "denied" | "unavailable";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [subculture, setSubculture] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState("");
  const [recentWords, setRecentWords] = useState<
    { word: string; created_at: string }[]
  >([]);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("unknown");
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);

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

  // Check location status on a 1-second poll, fetch recent words on load
  useEffect(() => {
    if (!loading) {
      checkLocationStatus();
      fetchRecent();
      const locInterval = setInterval(checkLocationStatus, 1000);
      return () => clearInterval(locInterval);
    }
  }, [loading, fetchRecent]);

  // Token refresh for logged-in users
  useEffect(() => {
    if (user) {
      refreshInterval.current = setInterval(() => {
        const google = (window as any).google;
        if (google?.accounts?.id) {
          google.accounts.id.prompt(() => {});
        }
      }, 45 * 60 * 1000);

      return () => {
        if (refreshInterval.current) clearInterval(refreshInterval.current);
      };
    }
  }, [user]);

  function checkLocationStatus() {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus("granted"),
      () => setLocationStatus("denied"),
      { timeout: 5000 }
    );
  }

  async function handleLogin(credential: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      setShowLoginDropdown(false);
      fetchRecent();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim() || submitting) return;

    setSubmitting(true);

    let lat: number | null = null;
    let lng: number | null = null;
    let locType: "gps" | "ip" | null = null;
    let clientIp: string | null = null;

    // Always fetch public IP from ip-api
    try {
      const ipRes = await fetch("http://ip-api.com/json/?fields=lat,lon,query");
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        clientIp = ipData.query ?? null;
        // Try browser geolocation first
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 3000,
            })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          locType = "gps";
        } catch {
          // Fall back to IP-based coords
          lat = ipData.lat ?? null;
          lng = ipData.lon ?? null;
          if (lat != null) locType = "ip";
        }
      }
    } catch {
      // ip-api failed — try browser geolocation alone
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3000,
          })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        locType = "gps";
      } catch {
        // No location available at all
      }
    }

    const res = await fetch("/api/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: word.trim(),
        definition: definition.trim() || null,
        subculture: subculture.trim() || null,
        sourceUrl: sourceUrl.trim() || null,
        lat,
        lng,
        locType,
        ip: clientIp,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setFlash(`"${data.word}" logged`);
      setWord("");
      setDefinition("");
      setSubculture("");
      setSourceUrl("");
      setShowOptional(false);
      fetchRecent();
      setTimeout(() => setFlash(""), 2000);
    }

    setSubmitting(false);
  }

  function getLocationIndicator() {
    switch (locationStatus) {
      case "checking":
      case "unknown":
        return { dot: "bg-red-500", label: "Location off" };
      case "granted":
        return { dot: "bg-green-500", label: "Location on" };
      case "denied":
        return { dot: "bg-red-500", label: "Location off" };
      case "unavailable":
        return { dot: "bg-red-500", label: "Location unavailable" };
    }
  }

  const locInfo = getLocationIndicator();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-foreground/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-foreground/10">
        <h1 className="font-bold text-lg">Word Research</h1>
        <div className="flex items-center gap-3">
          {user ? (
            <button
              onClick={() => router.push("/profile")}
              className="text-sm text-foreground/60 hover:text-foreground transition cursor-pointer"
            >
              {user.name || "Profile"}
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowLoginDropdown(!showLoginDropdown)}
                className="text-sm text-foreground/60 hover:text-foreground transition cursor-pointer"
              >
                Sign in
              </button>
              {showLoginDropdown && (
                <div className="absolute right-0 top-full mt-2 p-4 bg-background border border-foreground/10 rounded-lg shadow-lg z-50">
                  <p className="text-xs text-foreground/50 mb-3 whitespace-nowrap">
                    Sign in to track your score
                  </p>
                  <GoogleLogin
                    onSuccess={(res) => {
                      if (res.credential) handleLogin(res.credential);
                    }}
                    onError={() => console.error("Login failed")}
                    size="medium"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-6 max-w-lg mx-auto w-full">
        {!user && (
          <div className="text-center mb-2">
            <p className="text-foreground/60 max-w-md text-sm">
              Spot new words before they go mainstream. Like Merlin Bird ID, but
              for language.
            </p>
          </div>
        )}

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
              + add url, definition, or subculture
            </button>
          )}

          {showOptional && (
            <>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="(optional) Did you see it online? Link to it here!"
                className="w-full px-4 py-2 rounded-lg border border-foreground/20 bg-transparent text-sm focus:outline-none focus:border-foreground/50"
              />
              <input
                type="text"
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="(optional) What does it mean? How is it used?"
                className="w-full px-4 py-2 rounded-lg border border-foreground/20 bg-transparent text-sm focus:outline-none focus:border-foreground/50"
              />
              <input
                type="text"
                value={subculture}
                onChange={(e) => setSubculture(e.target.value)}
                placeholder="(optional) Did a particular subculture use it?"
                className="w-full px-4 py-2 rounded-lg border border-foreground/20 bg-transparent text-sm focus:outline-none focus:border-foreground/50"
              />
            </>
          )}

          <button
            type="submit"
            disabled={!word.trim() || submitting}
            className="w-full py-3 rounded-lg bg-foreground text-background font-medium disabled:opacity-40 hover:opacity-90 transition cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Logging...
              </>
            ) : "Log it"}
          </button>
        </form>

        {/* Location status indicator */}
        <div className="w-full">
          <button
            onClick={() => {
              if (locationStatus === "denied" || locationStatus === "unavailable") {
                setShowLocationHelp(!showLocationHelp);
              }
            }}
            className="flex items-center gap-2 text-xs text-foreground/50 hover:text-foreground/70 transition cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${locInfo.dot}`} />
            {locInfo.label}
            {(locationStatus === "denied" || locationStatus === "unavailable") && (
              <span className="underline">How to enable</span>
            )}
          </button>

          {showLocationHelp && (
            <div className="mt-3 p-4 rounded-lg bg-foreground/5 text-sm space-y-4">
              <p className="text-foreground/70">
                Location helps us understand where new words are emerging. Your
                submissions will still be saved without it, but turning it on
                makes the data much more useful.
              </p>

              <div>
                <p className="font-medium text-foreground/80 mb-1">iPhone (Safari)</p>
                <ol className="list-decimal list-inside text-foreground/60 space-y-1">
                  <li>Open <strong>Settings</strong> &gt; <strong>Privacy &amp; Security</strong> &gt; <strong>Location Services</strong></li>
                  <li>Make sure Location Services is turned <strong>on</strong></li>
                  <li>Scroll down and tap <strong>Safari Websites</strong></li>
                  <li>Select <strong>While Using the App</strong> or <strong>Ask Next Time</strong></li>
                  <li>Come back here and refresh the page</li>
                </ol>
              </div>

              <div>
                <p className="font-medium text-foreground/80 mb-1">Chrome (Desktop)</p>
                <ol className="list-decimal list-inside text-foreground/60 space-y-1">
                  <li>Click the <strong>lock icon</strong> (or tune icon) in the address bar</li>
                  <li>Find <strong>Location</strong> and set it to <strong>Allow</strong></li>
                  <li>Refresh the page</li>
                </ol>
              </div>

              <div>
                <p className="font-medium text-foreground/80 mb-1">Chrome (Android / iPhone)</p>
                <ol className="list-decimal list-inside text-foreground/60 space-y-1">
                  <li>Tap the <strong>lock icon</strong> in the address bar</li>
                  <li>Tap <strong>Permissions</strong> (or <strong>Site settings</strong>)</li>
                  <li>Set <strong>Location</strong> to <strong>Allow</strong></li>
                  <li>Refresh the page</li>
                </ol>
              </div>

              <button
                onClick={() => {
                  setShowLocationHelp(false);
                  checkLocationStatus();
                }}
                className="text-xs text-foreground/50 hover:text-foreground/70 underline cursor-pointer"
              >
                I turned it on — recheck
              </button>
            </div>
          )}
        </div>

        {flash && (
          <p className="text-sm font-medium text-green-500">{flash}</p>
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
