"use client";
import { useState, useCallback, createContext, useContext, useRef, useEffect } from "react";

type ToastType = "success" | "error" | "info" | "breaking";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;       // optional title shown above message
  onAction?: () => void; // optional click handler — clicking toast invokes it
  duration?: number;     // ms (defaults by type)
}

interface ToastOptions {
  title?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

function ToastMessage({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultDuration = toast.type === "breaking" ? 6000 : 2500;
  const duration = toast.duration ?? defaultDuration;

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onRemove, duration]);

  const isBreaking = toast.type === "breaking";
  const bgColor = toast.type === "error"
    ? "var(--danger)"
    : isBreaking
    ? "rgba(21,22,28,0.96)"
    : toast.type === "info"
    ? "var(--surface-active)"
    : "var(--foreground-bright)";

  const textColor = (toast.type === "info" || isBreaking) ? "var(--foreground-bright)" : "#fff";

  const accentColor = isBreaking ? "#ef4444" : "#FFB000";

  const handleClick = () => {
    if (toast.onAction) {
      toast.onAction();
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }
  };

  return (
    <div
      className={exiting ? "toast-exit" : "toast-enter"}
      onClick={handleClick}
      style={{
        background: bgColor,
        color: textColor,
        borderLeft: `4px solid ${accentColor}`,
        border: isBreaking ? `1px solid rgba(239,68,68,0.3)` : undefined,
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
        padding: isBreaking ? "12px 16px" : "10px 16px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        boxShadow: isBreaking
          ? "0 6px 28px rgba(239,68,68,0.18), 0 4px 16px rgba(0,0,0,0.5)"
          : "0 4px 16px rgba(0,0,0,0.3)",
        pointerEvents: "auto",
        minWidth: isBreaking ? 320 : 200,
        maxWidth: isBreaking ? 420 : 360,
        cursor: toast.onAction ? "pointer" : "default",
        backdropFilter: isBreaking ? "blur(12px)" : undefined,
      }}
    >
      {isBreaking && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{
            fontSize: 8,
            fontWeight: 800,
            color: "#fff",
            background: "#ef4444",
            padding: "2px 6px",
            borderRadius: 1,
            letterSpacing: "0.08em",
            lineHeight: 1.5,
            fontFamily: "var(--font-heading)",
            animation: "pulse-dot 2s ease-in-out infinite",
          }}>
            속보
          </span>
          {toast.title && (
            <span style={{ fontSize: 10, color: "#8C8C91", fontWeight: 500 }}>
              {toast.title}
            </span>
          )}
        </div>
      )}
      <div style={{
        fontSize: isBreaking ? 13 : 12,
        lineHeight: isBreaking ? 1.45 : 1.4,
        fontWeight: isBreaking ? 600 : 500,
        color: isBreaking ? "#EBEBEB" : textColor,
      }}>
        {toast.message}
      </div>
      {toast.onAction && isBreaking && (
        <div style={{
          fontSize: 9,
          color: "#8C8C91",
          marginTop: 8,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          fontFamily: "var(--font-mono)",
        }}>
          클릭하여 열기 →
        </div>
      )}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success", options?: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        type,
        title: options?.title,
        onAction: options?.onAction,
        duration: options?.duration,
      },
    ]);
  }, []);

  // Breaking toasts anchor bottom-right; other toasts stay bottom-center
  const breakingToasts = toasts.filter((t) => t.type === "breaking");
  const normalToasts = toasts.filter((t) => t.type !== "breaking");

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Normal toasts — bottom center */}
      <div
        style={{
          position: "fixed",
          bottom: 40,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {normalToasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
      {/* Breaking toasts — bottom right stack */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 10,
          pointerEvents: "none",
          maxWidth: 440,
        }}
      >
        {breakingToasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
