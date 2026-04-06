import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AuthContextType {
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  login: (userId: number, userName: string, userEmail: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const login = useCallback((id: number, name: string, email: string) => {
    setUserId(id);
    setUserName(name);
    setUserEmail(email);
    localStorage.setItem('user-id', String(id));
    localStorage.setItem('user-name', name);
    localStorage.setItem('user-email', email);
  }, []);

  const logout = useCallback(() => {
    setUserId(null);
    setUserName(null);
    setUserEmail(null);
    localStorage.removeItem('user-id');
    localStorage.removeItem('user-name');
    localStorage.removeItem('user-email');
  }, []);

  return (
    <AuthContext.Provider value={{ userId, userName, userEmail, login, logout, isAuthenticated: userId !== null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
