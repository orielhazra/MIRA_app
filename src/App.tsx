import React, { useState, useEffect } from "react";
import AppProviders from "./app/AppProviders";
import MainLayout from "./app/layout/MainLayout";
import { repository } from "./services/repository";

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Asynchronously load the SQLite Write-Through Cache before mounting the app
    repository.initialize().then(() => {
      setLoading(false);
    }).catch((error) => {
      console.error("Database initialization failed:", error);
      setLoading(false); // Fallback to mount anyway
    });
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
          fontFamily: "system-ui, sans-serif"
        }}
      >
        <h2 style={{ marginBottom: "12px", fontSize: "24px", fontWeight: 600 }}>Loading M.I.R.A. Database...</h2>
        <p style={{ color: "#8e8e93", fontSize: "14px" }}>Synchronizing secure local records</p>
      </div>
    );
  }

  return (
    <AppProviders>
      <MainLayout />
    </AppProviders>
  );
}
