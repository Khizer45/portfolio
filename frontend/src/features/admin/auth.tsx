"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { ApiError, api, onUnauthorized, setCsrfToken } from "@/features/admin/api";
import { Spinner } from "@/features/admin/ui";
import type { AdminUser, SessionInfo } from "@/types/api";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null; expired?: boolean }
  | { status: "authenticated"; user: AdminUser };

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  const accept = useCallback((session: SessionInfo) => {
    setCsrfToken(session.csrf_token);
    setState({ status: "authenticated", user: session.user });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get<SessionInfo>("/auth/me", controller.signal)
      .then(accept)
      .catch((error) => {
        if ((error as Error).name === "AbortError") return;
        setCsrfToken(null);
        setState({ status: "anonymous", user: null });
      });
    const unsubscribe = onUnauthorized(() => {
      setCsrfToken(null);
      setState({ status: "anonymous", user: null, expired: true });
    });
    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [accept]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: async (email, password) => accept(await api.post<SessionInfo>("/auth/login", { email, password })),
      logout: async () => {
        try {
          await api.post("/auth/logout");
        } catch (error) {
          // Unless the session has already ended (401), it is still active on the server:
          // stay signed in so the user sees the error and can try again.
          if (!(error instanceof ApiError && error.status === 401)) throw error;
        }
        setCsrfToken(null);
        setState({ status: "anonymous", user: null });
      },
    }),
    [state, accept],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** Only allow redirects back into the admin area (prevents open redirects). */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/admin") && !next.startsWith("//") && !next.startsWith("/admin/login") ? next : "/admin";
}

/**
 * Renders children only for a signed-in administrator. This is a convenience for the
 * UI; every admin API request is also authorized by the backend.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.status === "anonymous") {
      const params = new URLSearchParams({ next: pathname });
      if (auth.expired) params.set("expired", "1");
      router.replace(`/admin/login?${params}`);
    }
  }, [auth, pathname, router]);

  if (auth.status !== "authenticated") {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner label={auth.status === "loading" ? "Checking your session…" : "Redirecting to sign in…"} />
      </div>
    );
  }
  return <>{children}</>;
}
