import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

type ToastTone = "success" | "error" | "info";

type ToastOptions = {
  title: string;
  message?: string;
  tone?: ToastTone;
  duration?: number;
};

type ToastItem = ToastOptions & {
  id: string;
  tone: ToastTone;
  duration: number;
};

type ToastApi = {
  show: (options: ToastOptions) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const MAX_TOASTS = 2;
const DEFAULT_DURATION = 2200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeout = timeouts.current[id];
    if (timeout) {
      clearTimeout(timeout);
      delete timeouts.current[id];
    }
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const tone = options.tone ?? "info";
      const duration = options.duration ?? DEFAULT_DURATION;
      const toast: ToastItem = {
        id,
        tone,
        duration,
        title: options.title,
        message: options.message,
      };
      setToasts((prev) => [toast, ...prev].slice(0, MAX_TOASTS));
      timeouts.current[id] = setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, message, duration) =>
        show({ title, message, duration, tone: "success" }),
      error: (title, message, duration) =>
        show({ title, message, duration, tone: "error" }),
      info: (title, message, duration) =>
        show({ title, message, duration, tone: "info" }),
    }),
    [show]
  );

  useEffect(() => {
    return () => {
      Object.values(timeouts.current).forEach((timeout) =>
        clearTimeout(timeout)
      );
      timeouts.current = {};
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastViewport({ toasts }: { toasts: ToastItem[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.viewport, { paddingTop: insets.top + spacing.xs }]}
    >
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

function ToastRow({ toast }: { toast: ToastItem }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  const toneStyle =
    toast.tone === "success"
      ? styles.toastSuccess
      : toast.tone === "error"
      ? styles.toastError
      : styles.toastInfo;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.toast,
        toneStyle,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.toastTitle}>{toast.title}</Text>
      {toast.message ? (
        <Text style={styles.toastMessage}>{toast.message}</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: "absolute",
    top: 0,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.xs,
    zIndex: 1000,
  },
  toast: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  toastSuccess: {
    borderColor: colors.success,
  },
  toastError: {
    borderColor: colors.danger,
  },
  toastInfo: {
    borderColor: colors.cobalt,
  },
  toastTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: colors.ink,
  },
  toastMessage: {
    marginTop: 2,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.slate,
  },
});
