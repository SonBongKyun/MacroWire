"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            minHeight: 300,
            padding: "40px 24px",
            backgroundColor: "#0D0E12",
            color: "#8C8C91",
            textAlign: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 4,
              border: "1px solid #2C2D34",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8C8C91"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h2
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#EBEBEB",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            문제가 발생했습니다
          </h2>

          {this.state.error && (
            <p
              style={{
                fontSize: 12,
                color: "#8C8C91",
                margin: 0,
                maxWidth: 400,
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </p>
          )}

          <button
            onClick={this.handleReload}
            style={{
              marginTop: 8,
              padding: "8px 20px",
              fontSize: 12,
              fontWeight: 600,
              color: "#0D0E12",
              backgroundColor: "#C9A96E",
              border: "none",
              borderRadius: 2,
              cursor: "pointer",
              letterSpacing: "0.01em",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
