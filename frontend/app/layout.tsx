import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/hooks/useToast";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChangeSignal AI - Competitor Intelligence Platform",
  description: "Monitor competitor websites and detect meaningful changes with AI-powered analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="font-sans antialiased text-slate-900 bg-slate-50">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
