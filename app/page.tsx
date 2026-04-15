"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { VT323 } from "next/font/google";
import s from "./landing.module.css";

const vt323 = VT323({ weight: "400", subsets: ["latin"] });

export default function LandingPage() {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Particle animation
    const container = particlesRef.current;
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < 30; i++) {
      const p = document.createElement("div");
      const size = (1 + Math.random() * 1.5) + "px";
      p.style.cssText = `
        position: absolute;
        width: ${size}; height: ${size};
        background: #39ff14;
        border-radius: 50%;
        box-shadow: 0 0 4px #39ff14;
        opacity: 0;
        left: ${Math.random() * 100}%;
        animation: lp-float ${8 + Math.random() * 12}s linear ${Math.random() * 12}s infinite;
      `;
      container.appendChild(p);
    }

    // Scroll reveal
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(s.visible);
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(`.${s.reveal}`).forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Inject particle keyframe globally once */}
      <style>{`
        @keyframes lp-float {
          0%   { transform: translateY(100vh); opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-10vh); opacity: 0; }
        }
      `}</style>

      <div className={`${s.landing} ${vt323.className}`}>
        <div className={s.gridBg} />
        <div className={s.particles} ref={particlesRef} />

        {/* HERO */}
        <div className={s.hero}>
          <div className={s.heroTag}>blockdag // AI inference // optimistic proofs</div>

          <h1 className={`${s.heroTitle} ${vt323.className}`}>KERYX</h1>
          <div className={`${s.heroSubtitle} ${vt323.className}`}>Free Intelligence Engine</div>

          <p className={s.heroDesc}>
            The first <strong>BlockDAG</strong> built for decentralized AI inference.
            Optimistic proofs. <strong>Unstoppable intelligence.</strong>
          </p>

          <div className={s.heroButtons}>
            <a href="#protocol" className={`${s.btnPrimary} ${vt323.className}`}>
              Explore the protocol
            </a>
            <Link href="/explorer" className={`${s.btnGhost} ${vt323.className}`}>
              Live Explorer
            </Link>
            <Link href="/wallet" className={`${s.btnGhost} ${vt323.className}`}>
              Web Wallet
            </Link>
          </div>

          <div className={s.heroTerminal}>
            <div className={s.terminalBar}>keryx-node v0.1.0</div>
            <div className={s.terminalLine}>
              <span className={s.prompt}>$</span>{" "}
              <span className={s.cmd}>keryx-node --start --network mainnet</span>
            </div>
            <div className={s.terminalLine}>
              <span className={s.comment}># verifying model integrity...</span>
            </div>
            <div className={s.terminalLine}>
              <span className={s.ok}>✓</span> Phi-3-Keryx-v1 [sha256:a3f7c...] loaded from IPFS
            </div>
            <div className={s.terminalLine}>
              <span className={s.ok}>✓</span> Miner collateral: 5,000 KRX locked
            </div>
            <div className={s.terminalLine}>
              <span className={s.ok}>✓</span> GHOSTDAG sync — 10 BPS active
            </div>
            <div className={s.terminalLine}>
              <span className={s.warn}>⚠</span>{" "}
              <span className={s.warn}>Mempool empty — switching to synthetic tasks</span>
            </div>
            <div className={s.terminalLine}>
              <span className={s.prompt}>$</span>{" "}
              <span className={s.cmd}>mining.start()</span>
              <span className={s.cursorBlink} />
            </div>
          </div>
        </div>

        {/* PROBLEM */}
        <section id="problem" className={s.section}>
          <div className={s.sectionLabel}>the problem</div>
          <h2 className={`${s.sectionTitle} ${vt323.className}`}>The Centralized Black Box</h2>
          <p className={s.sectionIntro}>
            Three corporations control the filters of global AI. On-chain agents can&apos;t run local models.
            They need a decentralized inference layer.
          </p>

          <div className={s.cardGrid}>
            <div className={`${s.card} ${s.reveal}`}>
              <div className={s.cardLabel}>// threat</div>
              <h3 className={vt323.className}>Silent Censorship</h3>
              <p>AI providers quietly modify model outputs to align with corporate policies. No transparency, no audit trail, no recourse.</p>
            </div>
            <div className={`${s.card} ${s.reveal}`}>
              <div className={s.cardLabel}>// threat</div>
              <h3 className={vt323.className}>Prompt Surveillance</h3>
              <p>Every query passes through centralized servers. Your questions, strategies, and private data — logged, analyzed, monetized.</p>
            </div>
            <div className={`${s.card} ${s.reveal}`}>
              <div className={s.cardLabel}>// keryx</div>
              <h3 className={vt323.className}>Sovereign AI</h3>
              <p>The model runs across thousands of sovereign miners. No kill switch. Intelligence becomes a public infrastructure.</p>
            </div>
            <div className={`${s.card} ${s.reveal}`}>
              <div className={s.cardLabel}>// keryx</div>
              <h3 className={vt323.className}>Optimistic Verifiability</h3>
              <p>Miners lock tokens on every response. Anyone can challenge. Cheaters lose everything. Honesty is the only profitable strategy.</p>
            </div>
          </div>
        </section>

        <div className={s.divider} />

        {/* PROTOCOL */}
        <section id="protocol" className={s.section}>
          <div className={s.sectionLabel}>protocol</div>
          <h2 className={`${s.sectionTitle} ${vt323.className}`}>Optimistic Proof of Inference</h2>
          <p className={s.sectionIntro}>
            Respond first, verify only when challenged. Fast, practical, cryptographically secure.
          </p>

          <div className={s.flow}>
            <div className={`${s.flowStep} ${s.reveal}`}>
              <div className={`${s.flowNum} ${vt323.className}`}>01</div>
              <div>
                <h3 className={vt323.className}>Request</h3>
                <p>User or AI agent submits an <code>AI_Request</code> to the mempool with model ID and fees.</p>
              </div>
            </div>
            <div className={`${s.flowStep} ${s.reveal}`}>
              <div className={`${s.flowNum} ${vt323.className}`}>02</div>
              <div>
                <h3 className={vt323.className}>Inference</h3>
                <p>Miner runs the SLM on their GPU, publishes the response instantly, and locks a <code>collateral</code> as guarantee.</p>
              </div>
            </div>
            <div className={`${s.flowStep} ${s.reveal}`}>
              <div className={`${s.flowNum} ${vt323.className}`}>03</div>
              <div>
                <h3 className={vt323.className}>Challenge Window</h3>
                <p>For N blocks, any verifier can dispute the result. If challenged, a ZK fraud-proof is generated off-chain — no time pressure.</p>
              </div>
            </div>
            <div className={`${s.flowStep} ${s.reveal}`}>
              <div className={`${s.flowNum} ${vt323.className}`}>04</div>
              <div>
                <h3 className={vt323.className}>Finality</h3>
                <p>No challenge — result is final, miner earns reward. Fraud proven — miner is slashed, challenger is rewarded.</p>
              </div>
            </div>
          </div>

          <div className={`${s.noteBox} ${s.reveal}`}>
            <h4 className={vt323.className}>&gt; cold_start_bootstrap</h4>
            <p>
              No users yet? The protocol self-generates synthetic inference tasks derived from the previous block hash.
              Miners stay active, the network stays warm, infrastructure is battle-tested before the first real request.
            </p>
          </div>
        </section>

        <div className={s.divider} />

        {/* MARKET */}
        <section id="market" className={s.section}>
          <div className={s.sectionLabel}>use cases</div>
          <h2 className={`${s.sectionTitle} ${vt323.className}`}>Who Needs Keryx?</h2>
          <p className={s.sectionIntro}>
            Whether for humans seeking truth without filters or autonomous agents operating on-chain, Keryx is the trustless backbone of decentralized intelligence.
          </p>

          <div className={s.marketList}>
            <div className={`${s.marketItem} ${s.reveal}`}>
              <div className={`${s.marketMarker} ${vt323.className}`}>&gt;</div>
              <div>
                <h3 className={vt323.className}>AI Agents</h3>
                <p>On-chain agents on Ethereum or Solana can&apos;t run Ollama. Keryx provides a verifiable inference API for autonomous decision-making.</p>
              </div>
            </div>
            <div className={`${s.marketItem} ${s.reveal}`}>
              <div className={`${s.marketMarker} ${vt323.className}`}>&gt;</div>
              <div>
                <h3 className={vt323.className}>Uncensored Knowledge</h3>
                <p>Legal, medical, or political queries without corporate filters. A neutral AI that answers factually regardless of the topic.</p>
              </div>
            </div>
            <div className={`${s.marketItem} ${s.reveal}`}>
              <div className={`${s.marketMarker} ${vt323.className}`}>&gt;</div>
              <div>
                <h3 className={vt323.className}>Privacy-Preserving Inference</h3>
                <p>Future-proof architecture designed to support encrypted prompts, ensuring intelligence can be computed without compromising user data.</p>
              </div>
            </div>
          </div>
        </section>

        <div className={s.divider} />

        {/* TECH */}
        <section id="tech" className={s.section}>
          <div className={s.sectionLabel}>infrastructure</div>
          <h2 className={`${s.sectionTitle} ${vt323.className}`}>Tech Stack</h2>

          <div className={s.techList}>
            <div className={`${s.techRow} ${s.reveal}`}>
              <div className={`${s.techKey} ${vt323.className}`}>rusty-kaspa fork</div>
              <div className={s.techVal}>GHOSTDAG BlockDAG at 10 BPS. Memory-hard PoW to keep mining GPU-only.</div>
            </div>
            <div className={`${s.techRow} ${s.reveal}`}>
              <div className={`${s.techKey} ${vt323.className}`}>candle-core</div>
              <div className={s.techVal}>Pure-Rust ML framework by Hugging Face. Runs Phi-3 and TinyLlama natively.</div>
            </div>
            <div className={`${s.techRow} ${s.reveal}`}>
              <div className={`${s.techKey} ${vt323.className}`}>arkworks / halo2</div>
              <div className={s.techVal}>Groth16 fraud-proofs generated only when challenged. No real-time ZK bottleneck.</div>
            </div>
            <div className={`${s.techRow} ${s.reveal}`}>
              <div className={`${s.techKey} ${vt323.className}`}>IPFS</div>
              <div className={s.techVal}>Model weights stored off-chain, identified by SHA-256 hash, verified at node bootstrap.</div>
            </div>
            <div className={`${s.techRow} ${s.reveal}`}>
              <div className={`${s.techKey} ${vt323.className}`}>collateral layer</div>
              <div className={s.techVal}>Miners lock KRX as guarantee. Dishonest inference = slashed collateral.</div>
            </div>
            <div className={`${s.techRow} ${s.reveal}`}>
              <div className={`${s.techKey} ${vt323.className}`}>governance</div>
              <div className={s.techVal}>On-chain voting to upgrade models. The network evolves without hard forks.</div>
            </div>
          </div>
        </section>

        <div className={s.divider} />

        {/* ROADMAP */}
        <section id="roadmap" className={s.section}>
          <div className={s.sectionLabel}>execution</div>
          <h2 className={`${s.sectionTitle} ${vt323.className}`}>Roadmap</h2>

          <div className={s.roadmap}>
            <div className={`${s.roadmapItem} ${s.roadmapActive} ${s.reveal}`}>
              <div className={`${s.roadmapPhase} ${vt323.className}`}>phase_1</div>
              <div>
                <h4 className={vt323.className}>Genesis</h4>
                <p>Fork rusty-kaspa. Anti-ASIC PoW. Candle integration. Mandatory synthetic inference from block 1. Every miner runs a model.</p>
              </div>
            </div>
            <div className={`${s.roadmapItem} ${s.reveal}`}>
              <div className={`${s.roadmapPhase} ${vt323.className}`}>phase_2</div>
              <div>
                <h4 className={vt323.className}>Economy</h4>
                <p>Collateral system. Challenge window. ZK fraud-proof generation and on-chain verification. Testnet with bug bounty.</p>
              </div>
            </div>
            <div className={`${s.roadmapItem} ${s.reveal}`}>
              <div className={`${s.roadmapPhase} ${vt323.className}`}>phase_3</div>
              <div>
                <h4 className={vt323.className}>Oracle</h4>
                <p>Agent bridge for Ethereum and Solana. Public demo of cross-chain AI inference. The use case that retains the community.</p>
              </div>
            </div>
            <div className={`${s.roadmapItem} ${s.reveal}`}>
              <div className={`${s.roadmapPhase} ${vt323.className}`}>phase_4</div>
              <div>
                <h4 className={vt323.className}>Mainnet</h4>
                <p>Production deployment. On-chain governance and model registry. Multi-domain models. Larger model support as ZK-ML matures.</p>
              </div>
            </div>
          </div>
        </section>

        <div className={s.divider} />

        {/* CTA */}
        <div className={s.cta}>
          <h2 className={vt323.className}>Intelligence belongs to no one.</h2>
          <div className={`${s.ctaTagline} ${vt323.className}`}>
            &quot;Intelligence is the message. Keryx is the messenger.&quot;
          </div>
          <div className={s.ctaSub}>// fork. mine. liberate. //</div>
          <div className={s.heroButtons}>
            <Link href="/explorer" className={`${s.btnPrimary} ${vt323.className}`}>
              Live Explorer
            </Link>
            <Link href="/wallet" className={`${s.btnGhost} ${vt323.className}`}>
              Web Wallet
            </Link>
            <a href="#" className={`${s.btnGhost} ${vt323.className}`}>
              Whitepaper
            </a>
          </div>
        </div>

      </div>
    </>
  );
}
