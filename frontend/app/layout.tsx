import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/hooks/useToast";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChangeSignal AI - Competitor Intelligence Platform",
  description: "AI-powered competitive intelligence for business owners and teams. Monitor competitor websites, detect pricing and strategy changes, get actionable insights. Free trial, no credit card required.",
  keywords: ["competitive intelligence", "competitor monitoring", "AI analysis", "pricing tracking", "SaaS"],
  openGraph: {
    title: "ChangeSignal AI - Stay Ahead of the Competition",
    description: "Automatically monitor competitor websites and get AI-powered analysis on changes that matter.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('changesignal_theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=t==='dark'||(t==='system'&&d);document.documentElement.classList.toggle('dark',dark);})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased text-slate-900 bg-slate-50 dark:text-slate-100 dark:bg-slate-900">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
