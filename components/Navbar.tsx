"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (q.startsWith("keryx:") || q.startsWith("keryxtest:")) {
      router.push(`/address/${q}`);
    } else if (q.length === 64) {
      router.push(`/blocks/${q}`);
    } else {
      router.push(`/tx/${q}`);
    }
    setQuery("");
  }

  return (
    <nav className="border-b sticky top-0 z-50"
         style={{ background: "#000", borderColor: "var(--mx-border)" }}>
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">

        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/keryx-logo.png"
            alt="Keryx Labs"
            width={120}
            height={53}

            priority
          />
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-4 text-sm" style={{ color: "var(--mx-dim)" }}>
          <Link href="/" className="transition-colors hover:text-[#00e533]">Home</Link>
          <Link href="/explorer" className="transition-colors hover:text-[#00e533]">Explorer</Link>
          <Link href="/graph" className="transition-colors hover:text-[#00e533]">DAG</Link>
          <Link href="/wallet" className="transition-colors hover:text-[#39ff14]" style={{ color: "var(--mx-mid)" }}>Wallet</Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 flex">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="block hash / tx id / address..."
            className="flex-1 rounded-l px-3 py-1.5 text-sm focus:outline-none transition-colors"
            style={{
              background: "#020802",
              border: "1px solid var(--mx-border)",
              borderRight: "none",
              color: "var(--mx-text)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--mx-dim)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--mx-border)")}
          />
          <button
            type="submit"
            className="px-4 py-1.5 rounded-r text-sm transition-all"
            style={{
              background: "var(--mx-muted)",
              border: "1px solid var(--mx-border)",
              color: "var(--mx-mid)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--mx-dim)";
              (e.currentTarget as HTMLElement).style.color = "var(--mx-bright)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--mx-border)";
              (e.currentTarget as HTMLElement).style.color = "var(--mx-mid)";
            }}
          >
            ⌕
          </button>
        </form>
      </div>
    </nav>
  );
}
