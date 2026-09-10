import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const MiniPlayerPlaceholder: React.FC = () => {
  const handleClose = async () => {
    await getCurrentWindow().close();
  };

  return (
    <main
      aria-label="Mini Player"
      className="mini-player-placeholder"
      style={{
        backgroundColor: "#1e1916",
        color: "#fffbe9",
        minHeight: "100vh",
        minWidth: "100vw",
      }}
    >
      <h1>Endurance Mini Player</h1>
      <p>Mini Player controls are coming soon.</p>
      <button
        type="button"
        className="mini-player-close-button"
        onClick={handleClose}
        style={{
          backgroundColor: "#ceab93",
          border: "0",
          borderRadius: "8px",
          color: "#2a1d16",
          cursor: "pointer",
          padding: "8px 16px",
        }}
      >
        Close
      </button>
    </main>
  );
};
