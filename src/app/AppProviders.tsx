import React, { useState } from "react";
import { AppContext } from "../context/AppContext";
import useAppManager from "../hooks/useAppManager";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SafeErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App initialization error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function AppContent({ children }: { children: React.ReactNode }) {
  const app = useAppManager();
  return (
    <AppContext.Provider value={app}>
      {children}
    </AppContext.Provider>
  );
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  const fallback = (
    <div style={{ 
      padding: "2rem", 
      textAlign: "center", 
      color: "#ff6b6b",
      backgroundColor: "#121214",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <h2>Failed to initialize M.I.R.A.</h2>
      <p>An error occurred while starting the application.</p>
      <button 
        onClick={() => window.location.reload()} 
        style={{
          marginTop: "1rem",
          padding: "0.75rem 1.5rem",
          backgroundColor: "#3a3a3c",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer"
        }}
      >
        Reload Application
      </button>
    </div>
  );

  return (
    <SafeErrorBoundary fallback={fallback}>
      <AppContent>
        {children}
      </AppContent>
    </SafeErrorBoundary>
  );
}

