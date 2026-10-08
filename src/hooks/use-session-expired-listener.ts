import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { SESSION_EXPIRED_EVENT, getSessionToken } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';

export function useSessionExpiredListener() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => {
      qc.setQueryData(queryKeys.session(), null);
      qc.invalidateQueries({ queryKey: queryKeys.session() });
      qc.invalidateQueries({ queryKey: queryKeys.cart() });
      qc.invalidateQueries({ queryKey: queryKeys.favorites() });
      qc.invalidateQueries({ queryKey: queryKeys.profile() });
      qc.invalidateQueries({ queryKey: queryKeys.wallets() });
      if (
        !getSessionToken() &&
        !location.pathname.startsWith('/login') &&
        !location.pathname.startsWith('/register')
      ) {
        void navigate({ to: '/login', search: { redirect: location.pathname } });
      }
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [qc, navigate, location.pathname]);
}
