"use client";

import { Toaster } from "react-hot-toast";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3200,
        style: {
          borderRadius: "10px",
          border: "1px solid #dddddd",
          background: "#ffffff",
          color: "#111111",
          boxShadow: "0 4px 14px rgba(17, 17, 17, 0.08)",
          fontSize: "14px",
          padding: "12px 14px",
        },
        success: {
          style: {
            borderColor: "#108a00",
            color: "#108a00",
          },
          iconTheme: {
            primary: "#108a00",
            secondary: "#ffffff",
          },
        },
        error: {
          style: {
            borderColor: "#d93025",
            color: "#d93025",
          },
          iconTheme: {
            primary: "#d93025",
            secondary: "#ffffff",
          },
        },
      }}
    />
  );
}
