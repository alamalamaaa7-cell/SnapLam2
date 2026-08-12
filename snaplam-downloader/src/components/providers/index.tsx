"use client";

import { Toaster } from "sonner";
import { AuthProvider } from "./session-provider";
import { ThemeProvider } from "./theme-provider";
import { SocketProvider } from "./socket-provider";
import { AppProvider } from "./app-provider";

// Compose all client providers in the correct order:
// Auth → Theme → Socket → App (App depends on Socket + Theme).
export function Providers({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme?: string;
}) {
  return (
    <AuthProvider>
      <ThemeProvider initialTheme={initialTheme}>
        <SocketProvider>
          <AppProvider>
            {children}
            <Toaster
              position="top-right"
              theme="dark"
              toastOptions={{
                classNames: {
                  toast: "glass !border-white/10",
                },
              }}
            />
          </AppProvider>
        </SocketProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
