import { createContext } from "react";
import type { MeResponse } from "../types/auth";

export type AuthContextType = {
  user: MeResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);


