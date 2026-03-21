"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // If no Supabase configured, skip auth (local dev)
  if (!supabase) return <>{children}</>;

  /* eslint-disable react-hooks/rules-of-hooks */

  // Listen for auth state
  useEffect(() => {
    supabase!.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkAllowed(session.user.email || "");
      else setLoading(false);
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkAllowed(session.user.email || "");
      else { setAllowed(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAllowed(userEmail: string) {
    const { data, error } = await supabase!
      .from("allowed_emails")
      .select("email")
      .eq("email", userEmail.toLowerCase())
      .single();

    setAllowed(!error && !!data);
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    try {
      const { error } = await supabase!.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : "check Supabase connection"}`);
    }
  }

  async function handleSignOut() {
    await supabase!.auth.signOut();
    setSession(null);
    setAllowed(null);
  }

  /* eslint-enable react-hooks/rules-of-hooks */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  // Not logged in — show login
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-white mb-1">Yousic Play</h1>
              <p className="text-sm text-slate-400">Financial Dashboard</p>
            </div>

            {sent ? (
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-emerald-400 text-xl">✓</span>
                </div>
                <p className="text-white font-medium mb-1">Check your email</p>
                <p className="text-sm text-slate-400 mb-4">
                  We sent a magic link to <span className="text-white">{email}</span>
                </p>
                <button
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin}>
                <label className="text-xs text-slate-400 font-medium block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yousicplay.com"
                  className="w-full bg-slate-950 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-blue-500 transition-colors mb-4"
                  autoFocus
                />
                {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  Send Magic Link
                </button>
                <p className="text-xs text-slate-500 text-center mt-3">
                  Access restricted to authorized team members.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Logged in but not allowed
  if (allowed === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
              <span className="text-red-400 text-xl">✕</span>
            </div>
            <h2 className="text-white font-bold mb-1">Access Denied</h2>
            <p className="text-sm text-slate-400 mb-4">
              <span className="text-white">{session.user.email}</span> is not authorized to access this dashboard.
            </p>
            <button
              onClick={handleSignOut}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Sign in with a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authorized — render dashboard with sign out option
  return (
    <div>
      <div className="fixed top-2 right-3 z-50 flex items-center gap-2">
        <span className="text-xs text-slate-500">{session.user.email}</span>
        <button
          onClick={handleSignOut}
          className="text-xs text-slate-500 hover:text-slate-300 bg-slate-800/80 border border-slate-700 rounded px-2 py-1 transition-colors"
        >
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
