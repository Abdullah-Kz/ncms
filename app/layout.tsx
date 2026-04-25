import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Smartify Brain — Child Development & Rehabilitation Center",
  description: "Integrated care management portal for Smartly Brain Child Development and Rehabilitation Center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  fontSize: "14px",
                },
                success: { iconTheme: { primary: "#10b981", secondary: "var(--bg-card)" } },
                error: { iconTheme: { primary: "#ef4444", secondary: "var(--bg-card)" } },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
