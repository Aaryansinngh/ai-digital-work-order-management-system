import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types';
import apiClient from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token')
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const verifyUser = async () => {
      try {
        if (!token) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const res = await apiClient.get('/auth/me');

        if (cancelled) return;

        const verifiedUser = res.data.user;

        if (!verifiedUser) {
          throw new Error('Invalid session');
        }

        setUser(verifiedUser);
        localStorage.setItem('user', JSON.stringify(verifiedUser));
      } catch {
        if (!cancelled) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    verifyUser();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', {
      email,
      password,
    });

    const { token: newToken, user: newUser } = res.data;

    if (!newToken || !newUser) {
      throw new Error('Invalid login response from server');
    }

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));

    setUser(newUser);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);
    setToken(null);
    setLoading(false);

    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};