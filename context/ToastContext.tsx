import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts } from '../config/fonts';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const CONFIG: Record<ToastType, { bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { bg: '#10B981', icon: 'checkmark-circle' },
  error:   { bg: '#EF4444', icon: 'close-circle' },
  info:    { bg: '#3B82F6', icon: 'information-circle' },
  warning: { bg: '#F59E0B', icon: 'warning' },
};

function ToastBanner({ toast }: { toast: ToastState }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cfg = CONFIG[toast.type];

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    translateY.setValue(-120);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 90,
        friction: 11,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -120, duration: 280, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { top: insets.top + 10, backgroundColor: cfg.bg, transform: [{ translateY }], opacity },
      ]}
      pointerEvents="none"
    >
      <Ionicons name={cfg.icon} size={20} color="#fff" />
      <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    counterRef.current += 1;
    setToast({ id: counterRef.current, message, type });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <ToastBanner toast={toast} />}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: '#fff',
    lineHeight: 20,
  },
});
