import { create } from 'zustand';
import { AuthUser } from '../hooks/useAuth';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  justRegistered: boolean;
  biometricLocked: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setJustRegistered: (value: boolean) => void;
  setBiometricLocked: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  justRegistered: false,
  biometricLocked: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setJustRegistered: (justRegistered) => set({ justRegistered }),
  setBiometricLocked: (biometricLocked) => set({ biometricLocked }),
}));
