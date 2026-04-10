import { create } from 'zustand';
import { AuthUser } from '../hooks/useAuth';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  justRegistered: boolean;
  justLoggedIn: boolean;
  biometricLocked: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setJustRegistered: (value: boolean) => void;
  setJustLoggedIn: (value: boolean) => void;
  setBiometricLocked: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  justRegistered: false,
  justLoggedIn: false,
  biometricLocked: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setJustRegistered: (justRegistered) => set({ justRegistered }),
  setJustLoggedIn: (justLoggedIn) => set({ justLoggedIn }),
  setBiometricLocked: (biometricLocked) => set({ biometricLocked }),
}));
