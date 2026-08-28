import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { readTokens, writeTokens } from "@/lib/api";
import type { User } from "@/types";
import * as authApi from "./api";

interface AuthValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => readTokens() !== null);
  const queryClient = useQueryClient();

  // A stored token survives a reload, so confirm who it belongs to on start-up.
  useEffect(() => {
    if (!readTokens()) return;

    let cancelled = false;
    authApi
      .fetchMe()
      .then((me) => !cancelled && setUser(me))
      .catch(() => writeTokens(null))
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const me = await authApi.login(email, password);
    setUser(me);
    return me;
  }, []);

  const signOut = useCallback(() => {
    writeTokens(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut }),
    [user, isLoading, signIn, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const value = use(AuthContext);
  if (!value) throw new Error("useAuth must be used inside an AuthProvider.");
  return value;
}
