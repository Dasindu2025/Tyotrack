import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tyotrack - Work Time & Project Tracking",
  description: "Modern time tracking and project management application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-dark-600 text-white antialiased`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "rgba(26, 31, 46, 0.95)",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(12px)",
              },
              success: {
                iconTheme: {
                  primary: "#00f5ff",
                  secondary: "#13171f",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ff4444",
                  secondary: "#13171f",
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
