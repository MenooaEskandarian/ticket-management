import { api, writeTokens, type Tokens } from "@/lib/api";
import type { User } from "@/types";

interface LoginResponse extends Tokens {
  user: User;
}

export async function login(email: string, password: string): Promise<User> {
  const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
  writeTokens({ access: data.access, refresh: data.refresh });
  return data.user;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}
