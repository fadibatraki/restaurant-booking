import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { getMe, login as loginRequest } from '@/lib/api';
import { clearStoredAuth, loadStoredAuth, saveStoredAuth } from '@/lib/auth-storage';
import type { LoginRequest, User } from '@/lib/types';

type AuthContextValue = {
  accessToken: string | null;
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (body: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAuth() {
      try {
        const storedAuth = await loadStoredAuth();

        if (!storedAuth) {
          return;
        }

        await getMe(storedAuth.accessToken);

        if (isMounted) {
          setAccessToken(storedAuth.accessToken);
          setUser(storedAuth.user);
        }
      } catch {
        await clearStoredAuth();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    hydrateAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (body: LoginRequest) => {
    const response = await loginRequest(body);

    setAccessToken(response.accessToken);
    setUser(response.user);
    await saveStoredAuth(response);
  }, []);

  const logout = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
    await clearStoredAuth();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      user,
      isLoggedIn: Boolean(accessToken),
      isLoading,
      login,
      logout,
    }),
    [accessToken, isLoading, login, logout, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
