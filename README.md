# keryx-ecosystem

The unified interface for the Keryx BlockDAG — Next.js Explorer, Web Wallet, BlockDAG Inspector, and landing page.

## Getting Started

### Prerequisites
- Node.js (v20+)
- Access to a running Keryx Node

### Installation

```bash
npm install
npm run build
npm start
```

Or for development:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## BlockDAG Inspector Credits

The BlockDAG Inspector (`/graph`) is inspired by **[DAGPulse](https://github.com/Yonkoo11/dagpulse)** by [@Yonkoo11](https://github.com/Yonkoo11), originally built for the Kaspathon hackathon.

DAGPulse is an open-source real-time BlockDAG visualization dashboard for the Kaspa network, released under the MIT License.

Key concepts adapted from DAGPulse:
- HTML5 Canvas-based rendering with a 60fps animation loop
- Block lerp animation (smooth position interpolation)
- Fade-in + glow effect on newly arrived blocks
- Pan (click-drag) and zoom (scroll wheel) interaction
- Column-based DAG layout algorithm (blocks grouped by DAA score)
- Bezier curve edges with arrow heads
- Vignette effect on canvas borders
- Auto-follow mode tracking the DAG tip

The implementation has been rewritten from Svelte to React/Next.js and adapted for the Keryx network (green color palette, `is_chain_block` distinction, Keryx REST API).

## Join the community

https://keryx-labs.com

https://discord.gg/U9eDmBUKTF

https://x.com/Keryx_Labs
