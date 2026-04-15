import type { Metadata } from "next";
import "./globals.css";
import ConditionalShell from "@/components/ConditionalShell";

export const metadata: Metadata = {
  title: "Keryx — Free Intelligence Engine",
  description: "BlockDAG built for decentralized AI inference. Optimistic proofs. Unstoppable intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-mono">
        <ConditionalShell>{children}</ConditionalShell>
      </body>
    </html>
  );
}
