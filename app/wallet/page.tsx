"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createMnemonic,
  isValidMnemonic,
  deriveKey,
  buildAndSignTx,
  sompiToKrx,
  krxToSompi,
  type WalletKey,
  type Utxo,
} from "@/lib/wallet";
import { api, type UtxoEntry } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Screen = "home" | "create" | "import" | "dashboard";

interface WalletState {
  key: WalletKey;
  mnemonic: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function shortAddr(addr: string): string {
  if (addr.length <= 20) return addr;
  return addr.slice(0, 14) + "…" + addr.slice(-8);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card p-5 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs mb-1" style={{ color: "var(--mx-dim)" }}>{children}</div>;
}

function GreenBtn({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-sm transition-all rounded-sm ${className}`}
      style={{
        background: disabled ? "var(--mx-muted)" : "var(--mx-dim)",
        color: disabled ? "var(--mx-dim)" : "var(--mx-bright)",
        border: "1px solid",
        borderColor: disabled ? "var(--mx-border)" : "var(--mx-mid)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--mx-bright)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 0 8px rgba(57,255,20,0.2)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = disabled ? "var(--mx-border)" : "var(--mx-mid)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {children}
    </button>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 text-sm rounded-sm focus:outline-none ${className}`}
      style={{
        background: "#020802",
        border: "1px solid var(--mx-border)",
        color: "var(--mx-text)",
      }}
      onFocus={(e) => (e.target.style.borderColor = "var(--mx-mid)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--mx-border)")}
    />
  );
}

// ── Screens ───────────────────────────────────────────────────────────────────

function HomeScreen({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
  return (
    <div className="max-w-lg mx-auto mt-16 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-widest glow mb-2" style={{ color: "var(--mx-bright)" }}>
          KERYX WALLET
        </h1>
        <p className="text-sm" style={{ color: "var(--mx-dim)" }}>
          Client-side wallet — private keys never leave your device
        </p>
      </div>

      <Card className="space-y-4">
        <GreenBtn onClick={onCreate} className="w-full py-3 text-base">
          ⊕ Create a new wallet
        </GreenBtn>
        <GreenBtn onClick={onImport} className="w-full py-3 text-base">
          ↩ Import with mnemonic phrase
        </GreenBtn>
      </Card>

      <div className="text-xs text-center" style={{ color: "var(--mx-muted)" }}>
        Private keys stay in your browser — they never leave your machine.
      </div>
    </div>
  );
}

function CreateScreen({ onSuccess }: { onSuccess: (mnemonic: string, key: WalletKey) => void }) {
  const [mnemonic] = useState(() => createMnemonic());
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const key = deriveKey(mnemonic);

  function handleCopy() {
    copyToClipboard(mnemonic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-5">
      <h2 className="text-lg font-bold" style={{ color: "var(--mx-bright)" }}>
        New wallet created
      </h2>

      <Card className="space-y-4">
        <Label>Mnemonic phrase (24 words) — SAVE IT IN A SAFE PLACE</Label>
        <div
          className="p-4 text-sm leading-7 tracking-wide font-mono"
          style={{
            background: "#000",
            border: "1px solid var(--mx-border)",
            color: "var(--mx-green)",
          }}
        >
          {mnemonic}
        </div>
        <GreenBtn onClick={handleCopy}>
          {copied ? "✓ Copied!" : "Copy phrase"}
        </GreenBtn>
      </Card>

      <Card className="space-y-2">
        <Label>Generated address</Label>
        <div className="text-xs font-mono break-all" style={{ color: "var(--mx-text)" }}>
          {key.address}
        </div>
      </Card>

      <Card>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-sm" style={{ color: "var(--mx-dim)" }}>
            I have saved my mnemonic phrase. I understand that without it, I cannot
            recover my funds.
          </span>
        </label>
      </Card>

      <GreenBtn
        onClick={() => onSuccess(mnemonic, key)}
        disabled={!confirmed}
        className="w-full py-3"
      >
        Go to dashboard →
      </GreenBtn>
    </div>
  );
}

function ImportScreen({ onSuccess }: { onSuccess: (mnemonic: string, key: WalletKey) => void }) {
  const [mnemonic, setMnemonic] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleOpen() {
    const clean = mnemonic.trim().replace(/\s+/g, " ");
    if (!isValidMnemonic(clean)) {
      setError("Invalid mnemonic phrase — check spelling and word count.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const key = deriveKey(clean);
      onSuccess(clean, key);
    } catch (e) {
      setError(`Derivation error: ${e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-5">
      <h2 className="text-lg font-bold" style={{ color: "var(--mx-bright)" }}>
        Import wallet
      </h2>

      <Card className="space-y-4">
        <Label>Mnemonic phrase (12 or 24 words, space-separated)</Label>
        <textarea
          value={mnemonic}
          onChange={(e) => { setMnemonic(e.target.value); setError(""); }}
          rows={4}
          placeholder="abandon ability able about above absent absorb abstract absurd abuse access..."
          className="w-full px-3 py-2 text-sm font-mono focus:outline-none resize-none rounded-sm"
          style={{
            background: "#020802",
            border: "1px solid var(--mx-border)",
            color: "var(--mx-text)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--mx-mid)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--mx-border)")}
        />
        {error && (
          <div className="text-xs px-3 py-2" style={{ color: "var(--mx-error)", background: "#1a0000", border: "1px solid #440000" }}>
            {error}
          </div>
        )}
        <GreenBtn onClick={handleOpen} disabled={loading || !mnemonic.trim()} className="w-full py-3">
          {loading ? "Deriving keys…" : "Open wallet →"}
        </GreenBtn>
      </Card>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ wallet, onDisconnect }: { wallet: WalletState; onDisconnect: () => void }) {
  const { key } = wallet;

  const [balanceSompi, setBalanceSompi] = useState<number | null>(null);
  const [utxos, setUtxos] = useState<UtxoEntry[]>([]);
  const [lastDaaScore, setLastDaaScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [balanceError, setBalanceError] = useState("");

  // Send form state
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("0.001");
  const [sendStatus, setSendStatus] = useState<"idle" | "signing" | "broadcasting" | "success" | "error">("idle");
  const [sendMsg, setSendMsg] = useState("");
  const [lastTxId, setLastTxId] = useState("");

  const [addrCopied, setAddrCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setBalanceError("");
    try {
      const [bal, u, info] = await Promise.all([
        api.balance(key.address),
        api.utxos(key.address),
        api.info(),
      ]);
      setBalanceSompi(bal.balance_sompi);
      setUtxos(u);
      setLastDaaScore(info.last_daa_score ?? 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setBalanceError(msg.includes("utxoindex")
        ? "Node must be started with --utxoindex to query live balance."
        : msg
      );
    } finally {
      setLoading(false);
    }
  }, [key.address]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  function handleCopyAddr() {
    copyToClipboard(key.address);
    setAddrCopied(true);
    setTimeout(() => setAddrCopied(false), 2000);
  }

  async function handleSend() {
    setSendStatus("signing");
    setSendMsg("");
    try {
      const amountSompi = krxToSompi(amount);
      const feeSompi = krxToSompi(fee);

      if (amountSompi <= 0) throw new Error("Invalid amount");
      if (feeSompi < 0) throw new Error("Invalid fee");
      if (!recipient.startsWith("keryx:")) throw new Error("Invalid destination address (must start with keryx:)");

      const walletUtxos: Utxo[] = utxos.map((u) => ({ ...u }));

      const { tx } = buildAndSignTx(
        walletUtxos,
        recipient,
        amountSompi,
        feeSompi,
        key.address,
        key.privateKeyHex,
        key.publicKeyHex,
        lastDaaScore
      );

      setSendStatus("broadcasting");

      const result = await api.broadcast(tx);
      setLastTxId(result.transaction_id);
      setSendStatus("success");
      setSendMsg("Transaction sent!");
      setRecipient("");
      setAmount("");
      setTimeout(refresh, 2000);
    } catch (e: unknown) {
      setSendStatus("error");
      setSendMsg(e instanceof Error ? e.message : String(e));
    }
  }

  const totalSompi = utxos.reduce((s, u) => s + u.amount_sompi, 0);
  const displayBalance = balanceSompi !== null ? balanceSompi : totalSompi;

  return (
    <div className="max-w-3xl mx-auto mt-8 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold glow" style={{ color: "var(--mx-bright)" }}>
            KERYX WALLET
          </h2>
          <div className="text-xs mt-1" style={{ color: "var(--mx-dim)" }}>
            Derivation path: m/44&apos;/111111&apos;/0&apos;/0/0
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="text-xs px-3 py-1.5 transition-colors"
          style={{ color: "var(--mx-dim)", border: "1px solid var(--mx-border)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--mx-error)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--mx-dim)"; }}
        >
          Disconnect
        </button>
      </div>

      {/* Address */}
      <Card>
        <Label>Your KRX address</Label>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-xs font-mono break-all" style={{ color: "var(--mx-green)" }}>
            {key.address}
          </div>
          <button
            onClick={handleCopyAddr}
            className="text-xs px-2 py-1 shrink-0 transition-colors"
            style={{ color: addrCopied ? "var(--mx-bright)" : "var(--mx-dim)", border: "1px solid var(--mx-border)" }}
          >
            {addrCopied ? "✓" : "copy"}
          </button>
          <button
            onClick={refresh}
            className="text-xs px-2 py-1 shrink-0 transition-colors"
            style={{ color: "var(--mx-dim)", border: "1px solid var(--mx-border)" }}
            title="Refresh"
          >
            ↺
          </button>
        </div>
      </Card>

      {/* Balance */}
      <Card>
        <Label>Balance</Label>
        {loading ? (
          <div className="text-sm animate-pulse" style={{ color: "var(--mx-dim)" }}>Loading…</div>
        ) : balanceError ? (
          <div className="text-xs" style={{ color: "var(--mx-error)" }}>{balanceError}</div>
        ) : (
          <div className="text-3xl font-bold font-mono" style={{ color: "var(--mx-bright)" }}>
            {sompiToKrx(displayBalance)}{" "}
            <span className="text-lg" style={{ color: "var(--mx-mid)" }}>KRX</span>
          </div>
        )}
      </Card>

      {/* UTXOs */}
      {utxos.length > 0 && (
        <Card>
          <Label>Available UTXOs ({utxos.length})</Label>
          <div className="space-y-1 max-h-48 overflow-y-auto mt-2">
            {utxos.map((u, i) => (
              <div key={i} className="flex justify-between text-xs font-mono py-0.5" style={{ borderBottom: "1px solid var(--mx-border)" }}>
                <span style={{ color: "var(--mx-dim)" }}>
                  {shortAddr(u.transaction_id)}:{u.index}
                  {u.is_coinbase && " [coinbase]"}
                </span>
                <span style={{ color: "var(--mx-text)" }}>{sompiToKrx(u.amount_sompi)} KRX</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Send form */}
      <Card className="space-y-4">
        <div className="font-bold text-sm" style={{ color: "var(--mx-mid)" }}>
          Send KRX
        </div>

        <div>
          <Label>Destination address</Label>
          <Input
            value={recipient}
            onChange={setRecipient}
            placeholder="keryx:q..."
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Amount (KRX)</Label>
            <Input
              value={amount}
              onChange={setAmount}
              placeholder="0.001"
              type="number"
            />
          </div>
          <div className="w-32">
            <Label>Fee (KRX)</Label>
            <Input
              value={fee}
              onChange={setFee}
              placeholder="0.001"
              type="number"
            />
          </div>
        </div>

        {/* Status messages */}
        {sendStatus === "success" && (
          <div className="text-xs p-3" style={{ background: "#001a00", border: "1px solid var(--mx-mid)", color: "var(--mx-green)" }}>
            {sendMsg}
            {lastTxId && (
              <div className="mt-1 break-all">
                TX ID:{" "}
                <a href={`/tx/${lastTxId}`} className="underline" style={{ color: "var(--mx-bright)" }}>
                  {lastTxId}
                </a>
              </div>
            )}
          </div>
        )}
        {sendStatus === "error" && (
          <div className="text-xs p-3 break-all" style={{ background: "#1a0000", border: "1px solid #440000", color: "var(--mx-error)" }}>
            Error: {sendMsg}
          </div>
        )}

        <GreenBtn
          onClick={handleSend}
          disabled={sendStatus === "signing" || sendStatus === "broadcasting" || !recipient || !amount}
          className="w-full py-3"
        >
          {sendStatus === "signing" && "⚙ Signing…"}
          {sendStatus === "broadcasting" && "📡 Broadcasting…"}
          {(sendStatus === "idle" || sendStatus === "success" || sendStatus === "error") && "Send →"}
        </GreenBtn>

        <div className="text-xs" style={{ color: "var(--mx-muted)" }}>
          Recommended fee: 0.0001–0.001 KRX. Transaction is signed locally before broadcast.
        </div>
      </Card>

      {/* TX history from indexer */}
      <TxHistory address={key.address} />
    </div>
  );
}

const TX_PAGE_SIZE = 10;

function TxHistory({ address }: { address: string }) {
  const [txs, setTxs] = useState<Array<{ tx_id: string; amount_sompi: number; daa_score: number }>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.address(address, TX_PAGE_SIZE, page * TX_PAGE_SIZE)
      .then((info) => {
        setTxs(info.transactions);
        setTotal(info.total_tx_count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address, page]);

  if (total === 0 && !loading) return null;

  const totalPages = Math.ceil(total / TX_PAGE_SIZE);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Label>Transaction history</Label>
        {total > 0 && (
          <span className="text-xs" style={{ color: "var(--mx-dim)" }}>
            {total.toLocaleString()} txs
          </span>
        )}
      </div>

      <div className="space-y-1 mt-2">
        {loading ? (
          <div className="text-xs py-4 text-center" style={{ color: "var(--mx-dim)" }}>Loading…</div>
        ) : txs.map((t) => (
          <div key={t.tx_id} className="flex justify-between items-center text-xs py-1 font-mono" style={{ borderBottom: "1px solid var(--mx-border)" }}>
            <a href={`/tx/${t.tx_id}`} className="transition-colors hover:text-[#39ff14]" style={{ color: "var(--mx-dim)" }}>
              {shortAddr(t.tx_id)}
            </a>
            <span style={{ color: "var(--mx-green)" }}>+{sompiToKrx(t.amount_sompi)} KRX</span>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-xs select-none">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 rounded transition-colors"
            style={{
              background: "var(--mx-panel)",
              color: page === 0 ? "var(--mx-dim)" : "var(--mx-green)",
              border: "1px solid var(--mx-border)",
              cursor: page === 0 ? "default" : "pointer",
            }}
          >
            ← Prev
          </button>

          <span style={{ color: "var(--mx-text)" }}>
            Page {page + 1} / {totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 rounded transition-colors"
            style={{
              background: "var(--mx-panel)",
              color: page >= totalPages - 1 ? "var(--mx-dim)" : "var(--mx-green)",
              border: "1px solid var(--mx-border)",
              cursor: page >= totalPages - 1 ? "default" : "pointer",
            }}
          >
            Next →
          </button>
        </div>
      )}
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [wallet, setWallet] = useState<WalletState | null>(null);

  function handleSuccess(mnemonic: string, key: WalletKey) {
    setWallet({ mnemonic, key });
    setScreen("dashboard");
  }

  function handleDisconnect() {
    setWallet(null);
    setScreen("home");
  }

  return (
    <main className="min-h-screen px-4 py-8">
      {screen === "home" && (
        <HomeScreen
          onCreate={() => setScreen("create")}
          onImport={() => setScreen("import")}
        />
      )}
      {screen === "create" && (
        <CreateScreen onSuccess={handleSuccess} />
      )}
      {screen === "import" && (
        <ImportScreen onSuccess={handleSuccess} />
      )}
      {screen === "dashboard" && wallet && (
        <Dashboard wallet={wallet} onDisconnect={handleDisconnect} />
      )}
    </main>
  );
}
