import { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, loading: true, isAdmin: false });

async function checkAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) setIsAdmin(await checkAdmin(data.session.user.id));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s) {
        setIsAdmin(await checkAdmin(s.user.id));
      } else {
        setIsAdmin(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, loading, isAdmin }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
