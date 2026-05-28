import React from "react";
import AppProviders from "./app/AppProviders";
import MainLayout from "./app/layout/MainLayout";
import { repository } from "./services/repository";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    repository.initialize()
      .then(() => setLoading(false))
      .catch((error) => {
        console.error("Database initialization failed:", error);
        setLoading(false);
      });
  }, []);

  React.useEffect(() => {
    const flushPersistence = () => {
      repository.persistence?.flush?.().catch((error: unknown) => {
        console.error("Failed to flush pending persistence writes:", error);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPersistence();
      }
    };

    window.addEventListener("beforeunload", flushPersistence);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", flushPersistence);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <div
        className="loading-screen"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#121214",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2 style={{ marginBottom: "12px", fontSize: "24px", fontWeight: 600 }}>
          Loading M.I.R.A. Database...
        </h2>
        <p style={{ color: "#8e8e93", fontSize: "14px" }}>
          Synchronizing secure local records
        </p>
      </div>
    );
  }

  return (
    <AppProviders>
      <ErrorBoundary>
        <MainLayout />
      </ErrorBoundary>
    </AppProviders>
  );
}
