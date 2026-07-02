import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/api/user.api';
import { authApi } from '@/api/auth.api';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    const hydrate = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await userApi.getMe();
        setUser(res.data || res);
      } catch {
        logout();
      }
    };
    hydrate();
  }, []);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // ignore
    } finally {
      logout();
    }
  };

  return { user, isAuthenticated, isLoading, logout: handleLogout };
};
