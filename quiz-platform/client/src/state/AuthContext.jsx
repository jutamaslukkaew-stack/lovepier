import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('access_token')));

  useEffect(() => {
    if (!localStorage.getItem('access_token')) return;
    api('/auth/me').then(({ user }) => setUser(user)).catch(() => localStorage.removeItem('access_token')).finally(() => setLoading(false));
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const result = await api('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
    localStorage.setItem('access_token', result.token);
    setUser(result.user);
  }, []);
  const logout = useCallback(() => { localStorage.removeItem('access_token'); setUser(null); }, []);
  const value = useMemo(() => ({ user, loading, loginWithGoogle, logout }), [user, loading, loginWithGoogle, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
