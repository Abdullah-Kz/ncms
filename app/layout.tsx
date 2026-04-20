import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "NCMS - Clinical Portal",
  description: "Neuro Clinical Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#111827",
                color: "#f1f5f9",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "10px",
                fontSize: "14px",
              },
              success: { iconTheme: { primary: "#10b981", secondary: "#111827" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#111827" } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
