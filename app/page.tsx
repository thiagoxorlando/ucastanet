import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <nav className="px-6 py-5 flex items-center justify-between border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-zinc-900 rounded-md" />
          <span className="font-semibold text-zinc-900 text-sm">ucastanet</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/agency/dashboard"
            className="text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-zinc-100 text-zinc-600 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          Now in beta · Free to join
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-zinc-900 tracking-tight max-w-2xl leading-tight">
          Connect talent with the right agencies
        </h1>

        <p className="mt-5 text-lg text-zinc-500 max-w-xl leading-relaxed">
          A modern platform for agencies to discover, manage, and collaborate
          with creators — and for talent to get found.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3 items-center">
          <Link href="/agency/dashboard">
            <button className="bg-zinc-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors cursor-pointer w-full sm:w-auto">
              Create Agency Account
            </button>
          </Link>
          <Link href="/talent/create-profile">
            <button className="bg-white text-zinc-900 border border-zinc-200 px-6 py-3 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors cursor-pointer w-full sm:w-auto">
              Join as Talent
            </button>
          </Link>
        </div>

        <p className="mt-4 text-xs text-zinc-400">
          No credit card required · Free for talent
        </p>
      </section>

      <section className="px-6 py-16 bg-zinc-50 border-t border-zinc-100">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              title: "For Agencies",
              description:
                "Build and manage your talent roster. Create detailed profiles, track reach, and collaborate efficiently.",
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
            },
            {
              title: "For Talent",
              description:
                "Create your public creator profile, showcase your social presence, and get discovered by top agencies.",
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ),
            },
            {
              title: "Built for speed",
              description:
                "Set up your profile in minutes. Our streamlined onboarding gets you in front of the right people fast.",
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.title} className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 shadow-sm">
                {item.icon}
              </div>
              <h3 className="font-semibold text-zinc-900 text-sm">{item.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-6 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-zinc-900 rounded" />
          <span className="text-xs text-zinc-500">ucastanet</span>
        </div>
        <p className="text-xs text-zinc-400">© 2026 ucastanet. All rights reserved.</p>
      </footer>
    </main>
  );
}
