import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthState = {
  token: string | null;
  phone: string | null;
  setToken: (t: string | null) => Promise<void>;
  setPhone: (p: string | null) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  phone: null,

  setToken: async (t) => {
    set({ token: t });
    if (t) await AsyncStorage.setItem('auth_token', t);
    else await AsyncStorage.removeItem('auth_token');
  },

  setPhone: (p) => set({ phone: p }),

  logout: async () => {
    set({ token: null });
    await AsyncStorage.removeItem('auth_token');
  },

  hydrate: async () => {
    const saved = await AsyncStorage.getItem('auth_token');
    if (saved) set({ token: saved });
  }
}));
