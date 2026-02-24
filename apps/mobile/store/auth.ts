import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { User } from '../lib/shared/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ session: null, user: null, loading: false }),
}));
