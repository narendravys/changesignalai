import Link from "next/link";

export const metadata = {
  title: "Privacy Policy - ChangeSignal AI",
  description: "Privacy Policy for ChangeSignal AI",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Last updated: 2026</p>
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
          <p>
            ChangeSignal AI respects your privacy. This is a placeholder; have your legal counsel draft
            a full Privacy Policy before public launch or fundraising.
          </p>
          <p>
            We collect account and usage data necessary to provide the service. We do not sell your data.
            Data is stored securely and used only to deliver competitive intelligence features.
          </p>
          <p>
            <strong>Contact:</strong> For privacy questions, contact support@changesignal.ai.
          </p>
        </div>
      </main>
    </div>
  );
}
