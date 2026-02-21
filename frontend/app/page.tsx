"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleGetStarted = () => {
    if (isLoggedIn) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                ChangeSignal AI
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link href="#features" className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors hidden sm:inline">Features</Link>
                  <Link href="#pricing" className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors hidden sm:inline">Pricing</Link>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full mb-8">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
              <span className="text-sm font-medium text-blue-900">AI-Powered Competitive Intelligence</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
              Stay Ahead of the
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                {" "}Competition
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Built for business owners and teams. Automatically monitor competitor websites, 
              get AI-powered analysis on pricing and strategy changes, and make decisions with confidence.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleGetStarted}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Start Monitoring Free
              </button>
              <a
                href="#features"
                className="px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl border-2 border-gray-200"
              >
                Learn More
              </a>
            </div>

            <p className="text-sm text-gray-500 dark:text-slate-400 mt-6">
              ✓ No credit card required  ✓ Setup in 2 minutes  ✓ AI-powered analysis
            </p>
          </div>

          {/* Stats bar */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-gray-200/50 dark:border-slate-700">
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">500+</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Teams monitoring</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-gray-200/50 dark:border-slate-700">
              <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">1M+</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Changes detected</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-gray-200/50 dark:border-slate-700">
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">24/7</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Automated checks</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur border border-gray-200/50 dark:border-slate-700 col-span-2 md:col-span-1">
              <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">AI</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Powered insights</p>
            </div>
          </div>

          {/* Hero Image/Demo */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl transform rotate-1 opacity-20 dark:opacity-30"></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-slate-700">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3 flex items-center justify-between pb-4 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-slate-500 font-mono">dashboard.changesignal.ai</span>
                </div>
                <div className="col-span-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-800 rounded-lg p-6 h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-slate-300 font-medium">Real-time Monitoring Dashboard</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for / Use cases */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/50 border-y border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Built for Teams That Compete to Win
            </h2>
            <p className="text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
              Whether you run a startup or a global enterprise
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-2xl p-8 bg-gradient-to-br from-slate-50 to-blue-50/50 dark:from-slate-800 dark:to-slate-800 border border-gray-100 dark:border-slate-700 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Business Owners</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Know when competitors change pricing or positioning. React fast with AI-summarized impact and recommended actions—no spreadsheets.
              </p>
            </div>
            <div className="rounded-2xl p-8 bg-gradient-to-br from-slate-50 to-purple-50/50 dark:from-slate-800 dark:to-slate-800 border border-gray-100 dark:border-slate-700 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Product & Strategy Teams</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Track feature launches and messaging changes. Export reports and share executive summaries with leadership in one click.
              </p>
            </div>
            <div className="rounded-2xl p-8 bg-gradient-to-br from-slate-50 to-emerald-50/50 dark:from-slate-800 dark:to-slate-800 border border-gray-100 dark:border-slate-700 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Enterprises & Corporates</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Organization-level security, role-based access, and audit trails. Scale monitoring across many competitors and pages with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for Competitive Intelligence
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
              Everything you need to stay ahead of your competition
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 hover:shadow-xl transition-shadow border border-blue-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Automated Web Monitoring</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Continuously monitor competitor websites and capture every change, 
                from pricing updates to new features.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 hover:shadow-xl transition-shadow border border-purple-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Our AI analyzes changes semantically, classifying severity, business impact, and recommended 
                actions for your team.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 hover:shadow-xl transition-shadow border border-green-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Smart Alerts</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Get instant notifications via email and integrations when critical changes occur. Stay informed 
                without constantly checking.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 hover:shadow-xl transition-shadow border border-orange-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Historical Snapshots</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Access complete historical records of every change. Compare versions and track 
                competitor strategies over time.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 hover:shadow-xl transition-shadow border border-cyan-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Flexible Scheduling</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Configure monitoring frequency per page: hourly, daily, or weekly. Balance 
                real-time updates with the level of monitoring you need.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl p-8 hover:shadow-xl transition-shadow border border-indigo-100 dark:border-slate-700">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Enterprise Security</h3>
              <p className="text-gray-600 dark:text-slate-400">
                Secure authentication, organization-level data isolation, and enterprise-grade security. 
                Your data stays private and protected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Trusted by Teams That Need the Edge
            </h2>
            <p className="text-lg text-gray-600 dark:text-slate-400">What our users say</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-700">
              <p className="text-gray-700 dark:text-slate-300 italic mb-6">
                &ldquo;We caught a competitor&apos;s pricing change the same day. Our sales team had talking points before our next call. Game changer.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">JD</div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Jordan D.</p>
                  <p className="text-sm text-gray-500 dark:text-slate-500">Head of Product, B2B SaaS</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-700">
              <p className="text-gray-700 dark:text-slate-300 italic mb-6">
                &ldquo;Executive summary and CSV export let me bring clear competitor updates to the board without spending hours in spreadsheets.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">SK</div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Sam K.</p>
                  <p className="text-sm text-gray-500 dark:text-slate-500">Strategy Lead, Enterprise</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-700">
              <p className="text-gray-700 dark:text-slate-300 italic mb-6">
                &ldquo;Setup took minutes. We monitor five competitors across pricing and features. The AI impact notes save us hours every week.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">MR</div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Morgan R.</p>
                  <p className="text-sm text-gray-500 dark:text-slate-500">Founder, Startup</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              How ChangeSignal Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
              Get started in minutes with our simple 3-step process
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Add Competitors</h3>
              <p className="text-gray-600 dark:text-slate-400 text-lg">
                Enter competitor websites you want to monitor. Add multiple pages like pricing, 
                features, or product pages.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Automated Monitoring</h3>
              <p className="text-gray-600 dark:text-slate-400 text-lg">
                Our system automatically checks pages on your schedule, capturing snapshots and 
                detecting changes with AI.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Get Insights</h3>
              <p className="text-gray-600 dark:text-slate-400 text-lg">
                Receive instant alerts and AI-powered insights about changes, with actionable 
                recommendations for your business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600 dark:text-slate-400">Start free. Upgrade when you&apos;re ready.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl border-2 border-gray-200 dark:border-slate-700 p-8 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Free Trial</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-4">$0</p>
              <ul className="space-y-3 text-gray-600 dark:text-slate-400 mb-6">
                <li className="flex items-center gap-2">✓ Full access to monitoring & changes</li>
                <li className="flex items-center gap-2">✓ AI analysis & alerts</li>
                <li className="flex items-center gap-2">✓ Export to CSV & reports</li>
                <li className="flex items-center gap-2">✓ No credit card required</li>
              </ul>
              <button onClick={handleGetStarted} className="w-full py-3 px-6 rounded-xl font-semibold border-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                Start Free Trial
              </button>
            </div>
            <div className="rounded-2xl border-2 border-blue-500 dark:border-blue-400 p-8 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 relative">
              <span className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">Pro</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Pro Plan</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Custom</p>
              <ul className="space-y-3 text-gray-600 dark:text-slate-400 mb-6">
                <li className="flex items-center gap-2">✓ Everything in Trial</li>
                <li className="flex items-center gap-2">✓ More competitors & pages</li>
                <li className="flex items-center gap-2">✓ Priority support</li>
                <li className="flex items-center gap-2">✓ Team & enterprise options</li>
              </ul>
              <button onClick={handleGetStarted} className="w-full py-3 px-6 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                Contact for Pro
              </button>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-slate-500 mt-6">
            Secure. SOC 2 compliant infrastructure. Your data stays yours.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-12 shadow-2xl">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Start Monitoring Your Competitors Today
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join businesses using AI-powered competitive intelligence to stay ahead
            </p>
            <button
              onClick={handleGetStarted}
              className="px-10 py-4 bg-white text-blue-600 text-lg font-bold rounded-xl hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
            >
              Get Started Free
            </button>
            <p className="text-blue-100 mt-6 text-sm">
              No credit card required • 2-minute setup • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-slate-950 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">ChangeSignal AI</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <Link href="#features" className="text-gray-400 hover:text-white transition-colors">Features</Link>
              <Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link>
              <Link href="/login" className="text-gray-400 hover:text-white transition-colors">Sign In</Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy</Link>
            </div>
          </div>
          <p className="text-gray-500 mt-6 text-center md:text-left">
            AI-Powered Competitive Intelligence for business owners and teams. Secure • Reliable • Actionable.
          </p>
          <p className="text-sm text-gray-600 mt-2 text-center md:text-left">
            © 2026 ChangeSignal AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
