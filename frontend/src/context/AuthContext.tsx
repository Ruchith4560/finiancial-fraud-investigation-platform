import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fraudlens_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('fraudlens_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('fraudlens_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success && res.data.data.user) {
          setUser(res.data.data.user);
          localStorage.setItem('fraudlens_user', JSON.stringify(res.data.data.user));
        }
      } catch {
        // Token expired or invalid
        localStorage.removeItem('fraudlens_token');
        localStorage.removeItem('fraudlens_user');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('fraudlens_token', newToken);
    localStorage.setItem('fraudlens_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('fraudlens_token');
    localStorage.removeItem('fraudlens_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
