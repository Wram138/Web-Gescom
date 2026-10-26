'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserSession {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'GERENTE' | 'CAIXA' | 'VENDEDOR';
  commissionRate?: number;
}

interface AuthContextType {
  user: UserSession | null;
  login: (userData: UserSession) => void;
  logout: () => void;
  isLoading: boolean;
  permissions: Record<string, string[]>;
  canAccess: (moduleKey: string) => boolean;
  reloadPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
  permissions: {},
  canAccess: () => true,
  reloadPermissions: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    // Utiliza sessionStorage para garantir que SEMPRE que o programa for aberto,
    // seja exigida a identificação do operador!
    const saved = sessionStorage.getItem('webgescom_session_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }

    loadPermissions().finally(() => {
      setIsLoading(false);
    });
  }, []);

  const loadPermissions = async () => {
    try {
      const res = await fetch('/api/permissions');
      if (res.ok) {
        const data = await res.json();
        setPermissions(data.permissions || {});
      }
    } catch (e) {
      console.error('Erro ao carregar permissões:', e);
    }
  };

  const login = (userData: UserSession) => {
    setUser(userData);
    sessionStorage.setItem('webgescom_session_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('webgescom_session_user');
  };

  const canAccess = (moduleKey: string): boolean => {
    if (!user) return false;
    // Administrador tem acesso irrestrito a todos os módulos
    if (user.role === 'ADMIN') return true;

    const rolePerms = permissions[user.role];
    if (!rolePerms) {
      // Fallback seguro caso ainda esteja carregando
      return true;
    }

    return rolePerms.includes(moduleKey);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isLoading,
        permissions,
        canAccess,
        reloadPermissions: loadPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
