import Link from "next/link";

export const metadata = {
  title: "Terms of Service - ChangeSignal AI",
  description: "Terms of Service for ChangeSignal AI",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
            ← Back to ChangeSignal AI
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Last updated: 2026</p>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p>
            Welcome to ChangeSignal AI. By using our service you agree to these terms. This is a placeholder;
            have your legal counsel draft full Terms of Service before public launch or fundraising.
          </p>
          <p>
            For demo and investor purposes: ChangeSignal AI provides competitive intelligence software.
            Use the product responsibly and in compliance with applicable laws and website terms of the
            sites you monitor.
          </p>
          <p>
            <strong>Contact:</strong> For questions, contact support@changesignal.ai.
          </p>
        </div>
      </main>
    </div>
  );
}
