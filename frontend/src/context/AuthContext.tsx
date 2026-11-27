import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { endSession, refreshAccessToken } from '../services/api';

interface AuthContextType {
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  accessToken: string | null;
  login: (token: string, userId: number, name: string, email: string) => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('access-token');
  });
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem('user-id');
    return stored ? parseInt(stored, 10) : null;
  });
  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem('user-name');
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem('user-email');
  });

  const login = useCallback((token: string, id: number, name: string, email: string) => {
    setAccessToken(token);
    setUserId(id);
    setUserName(name);
    setUserEmail(email);
    localStorage.setItem('access-token', token);
    localStorage.setItem('user-id', String(id));
    localStorage.setItem('user-name', name);
    localStorage.setItem('user-email', email);
  }, []);

  const logout = useCallback(async () => {
    await endSession();
    setAccessToken(null);
    setUserId(null);
    setUserName(null);
    setUserEmail(null);
    localStorage.removeItem('access-token');
    localStorage.removeItem('user-id');
    localStorage.removeItem('user-name');
    localStorage.removeItem('user-email');
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const newToken = await refreshAccessToken();
      if (newToken) setAccessToken(newToken);
      return newToken;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ userId, userName, userEmail, accessToken, login, logout, refreshToken, isAuthenticated: userId !== null && !!accessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function PiAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{
      userId: 1,
      userName: 'pi',
      userEmail: null,
      accessToken: null,
      login: () => {},
      logout: async () => {},
      refreshToken: async () => null,
      isAuthenticated: true,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
