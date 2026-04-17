/**
 * Keryx wallet cryptography — fully client-side.
 *
 * Key derivation:  BIP-39 → BIP-32 → secp256k1 (path m/44'/111111'/0'/0/index)
 * Address format:  keryx:<custom-bech32(version=0 || pubkey_x_32bytes)>
 * Transaction sig: Schnorr over Blake2b-256(key="TransactionSigningHash", sighash_preimage)
 */

import { mnemonicToSeedSync, generateMnemonic, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";
import { secp256k1, schnorr } from "@noble/curves/secp256k1.js";
import { blake2b } from "@noble/hashes/blake2.js";

// ── Constants ────────────────────────────────────────────────────────────────

const SUBNETWORK_ID_NATIVE = "0000000000000000000000000000000000000000";
const TX_VERSION = 0;
const MAX_SEQUENCE = BigInt("18446744073709551615"); // u64::MAX
const SIG_HASH_ALL = 0x01;

// Kaspa coin type in BIP-44 (registered as 111111)
const DERIVATION_PATH = "m/44'/111111'/0'/0";

// Coinbase outputs are spendable after COINBASE_MATURITY DAA scores.
const COINBASE_MATURITY = 100;

// Blake2b key for transaction signing hash
const SIGNING_HASH_KEY = new TextEncoder().encode("TransactionSigningHash");

// ── Keryx custom Bech32 ───────────────────────────────────────────────────────

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const REV_CHARSET: number[] = new Array(123).fill(100);
for (let i = 0; i < CHARSET.length; i++) {
  REV_CHARSET[CHARSET.charCodeAt(i)] = i;
}

function polymod(values: Uint8Array): bigint {
  let c = 1n;
  for (const d of values) {
    const c0 = c >> 35n;
    c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(d);
    if (c0 & 0x01n) c ^= 0x98f2bc8e61n;
    if (c0 & 0x02n) c ^= 0x79b76d99e2n;
    if (c0 & 0x04n) c ^= 0xf33e5fb3c4n;
    if (c0 & 0x08n) c ^= 0xae2eabe2a8n;
    if (c0 & 0x10n) c ^= 0x1e4f43e470n;
  }
  return c ^ 1n;
}

function checksumInput(fiveBitPayload: Uint8Array, prefix: string): Uint8Array {
  const prefixBytes = new TextEncoder().encode(prefix).map((c) => c & 0x1f);
  // prefix bytes + 0 separator + payload + 8 zero bytes for checksum
  const buf = new Uint8Array(prefixBytes.length + 1 + fiveBitPayload.length + 8);
  buf.set(prefixBytes, 0);
  buf[prefixBytes.length] = 0;
  buf.set(fiveBitPayload, prefixBytes.length + 1);
  // last 8 bytes remain 0 (checksum placeholder)
  return buf;
}

function conv8to5(payload: Uint8Array): Uint8Array {
  const bitLen = payload.length * 8;
  const outLen = Math.ceil(bitLen / 5);
  const out = new Uint8Array(outLen);
  let buff = 0;
  let bits = 0;
  let idx = 0;
  for (const b of payload) {
    buff = (buff << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out[idx++] = (buff >> bits) & 0x1f;
    }
  }
  if (bits > 0) out[idx] = (buff << (5 - bits)) & 0x1f;
  return out;
}

function conv5to8(payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(Math.floor((payload.length * 5) / 8));
  let buff = 0;
  let bits = 0;
  let idx = 0;
  for (const b of payload) {
    buff = (buff << 5) | b;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      out[idx++] = (buff >> bits) & 0xff;
    }
  }
  return out;
}

/** Encode [version(1 byte) + pubkeyBytes(32 bytes)] into a Keryx address string. */
function encodeKeryxAddress(version: number, pubkeyBytes: Uint8Array, prefix = "keryx"): string {
  const raw = new Uint8Array(1 + pubkeyBytes.length);
  raw[0] = version;
  raw.set(pubkeyBytes, 1);

  const fiveBit = conv8to5(raw);
  const checksumBuf = checksumInput(fiveBit, prefix);
  const checksum = polymod(checksumBuf);

  // Checksum: take be bytes [3..8] of u64, convert to 5-bit groups (5 bytes → 8 chars)
  const csBytes = new Uint8Array(5);
  let tmp = checksum;
  for (let i = 4; i >= 0; i--) {
    csBytes[i] = Number(tmp & 0xffn);
    tmp >>= 8n;
  }
  const csFiveBit = conv8to5(csBytes).slice(0, 8);

  const chars: string[] = [];
  for (const b of fiveBit) chars.push(CHARSET[b]);
  for (const b of csFiveBit) chars.push(CHARSET[b]);

  return `${prefix}:${chars.join("")}`;
}

// ── Key derivation ───────────────────────────────────────────────────────────

export function createMnemonic(): string {
  return generateMnemonic(wordlist, 256); // 24 words
}

export function isValidMnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic, wordlist);
}

export interface WalletKey {
  address: string;
  privateKeyHex: string;
  publicKeyHex: string; // 33-byte compressed
}

export function deriveKey(mnemonic: string, index = 0): WalletKey {
  const seed = mnemonicToSeedSync(mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(`${DERIVATION_PATH}/${index}`);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("Key derivation failed");
  }

  // Keryx uses Schnorr: address payload = 32-byte x-coordinate (compressed pubkey, drop prefix byte)
  const pubkeyX = child.publicKey.slice(1); // drop 0x02/0x03 prefix byte
  const address = encodeKeryxAddress(0, pubkeyX);

  return {
    address,
    privateKeyHex: Buffer.from(child.privateKey).toString("hex"),
    publicKeyHex: Buffer.from(child.publicKey).toString("hex"),
  };
}

// ── P2PK script helpers ───────────────────────────────────────────────────────

const OP_DATA_32 = 0x20;
const OP_DATA_65 = 0x41;
const OP_CHECKSIG = 0xac;

/** Builds the 34-byte P2PK scriptPublicKey for a 32-byte pubkey x-coordinate. */
export function buildP2PKScript(pubkeyX: Uint8Array): Uint8Array {
  const script = new Uint8Array(34);
  script[0] = OP_DATA_32;
  script.set(pubkeyX, 1);
  script[33] = OP_CHECKSIG;
  return script;
}

/** Builds the 66-byte P2PK signatureScript: OP_DATA_65 + <sig64> + <hashType>. */
function buildSigScript(sig: Uint8Array, hashType: number): Uint8Array {
  const script = new Uint8Array(66);
  script[0] = OP_DATA_65;
  script.set(sig, 1);
  script[65] = hashType;
  return script;
}

/** Derives the scriptPublicKey hex from a Keryx address string. */
export function addressToScriptHex(address: string): string {
  // Strip prefix and decode payload: first byte is version, next 32 are pubkeyX
  const colonIdx = address.indexOf(":");
  if (colonIdx === -1) throw new Error("Invalid address: missing prefix");
  const encoded = address.slice(colonIdx + 1);

  // Decode charset to 5-bit values (exclude last 8 chars = checksum)
  const fiveBit = new Uint8Array(encoded.length - 8);
  for (let i = 0; i < encoded.length - 8; i++) {
    const v = REV_CHARSET[encoded.charCodeAt(i)];
    if (v === 100) throw new Error(`Invalid character: ${encoded[i]}`);
    fiveBit[i] = v;
  }

  const raw = conv5to8(fiveBit); // [version(1)] + [pubkeyX(32)]
  if (raw.length < 33) throw new Error("Address payload too short");

  const pubkeyX = raw.slice(1, 33);
  const script = buildP2PKScript(pubkeyX);
  return Buffer.from(script).toString("hex");
}

// ── Sighash computation (Kaspa/Keryx protocol) ───────────────────────────────

interface UtxoForSigning {
  amount_sompi: number;
  script_version: number;
  script_public_key: string; // hex
}

interface InputForSigning {
  transaction_id: string; // hex, 32 bytes
  index: number;
  sequence: bigint;
  sig_op_count: number;
  utxo: UtxoForSigning;
}

interface OutputForSigning {
  amount: number;
  script_version: number;
  script_public_key: string; // hex
}

interface TxForSigning {
  version: number;
  inputs: InputForSigning[];
  outputs: OutputForSigning[];
  lock_time: bigint;
  subnetwork_id: string; // hex, 20 bytes
  gas: bigint;
  payload: Uint8Array;
}

// Keyed Blake2b-256 hasher (key = "TransactionSigningHash")
function newSigningHasher() {
  return blake2b.create({ key: SIGNING_HASH_KEY, dkLen: 32 });
}

function hashSigningHash(data: Uint8Array): Uint8Array {
  const h = newSigningHasher();
  h.update(data);
  return h.digest();
}

function u16LE(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}
function u32LE(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}
function u64LE(n: bigint): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, n, true);
  return b;
}
function varBytes(data: Uint8Array): Uint8Array {
  // length as u64 LE + bytes
  const lenBytes = u64LE(BigInt(data.length));
  const out = new Uint8Array(8 + data.length);
  out.set(lenBytes, 0);
  out.set(data, 8);
  return out;
}

function previousOutputsHash(tx: TxForSigning): Uint8Array {
  const h = newSigningHasher();
  for (const inp of tx.inputs) {
    h.update(hexToBytes(inp.transaction_id));
    h.update(u32LE(inp.index));
  }
  return h.digest();
}

function sequencesHash(tx: TxForSigning): Uint8Array {
  const h = newSigningHasher();
  for (const inp of tx.inputs) {
    h.update(u64LE(inp.sequence));
  }
  return h.digest();
}

function sigOpCountsHash(tx: TxForSigning): Uint8Array {
  const h = newSigningHasher();
  for (const inp of tx.inputs) {
    h.update(new Uint8Array([inp.sig_op_count]));
  }
  return h.digest();
}

function outputsHash(tx: TxForSigning): Uint8Array {
  const h = newSigningHasher();
  for (const out of tx.outputs) {
    h.update(u64LE(BigInt(out.amount)));
    h.update(u16LE(out.script_version));
    h.update(varBytes(hexToBytes(out.script_public_key)));
  }
  return h.digest();
}

function payloadHash(tx: TxForSigning): Uint8Array {
  // Native subnetwork + empty payload → ZERO_HASH
  if (tx.subnetwork_id === SUBNETWORK_ID_NATIVE && tx.payload.length === 0) {
    return new Uint8Array(32);
  }
  const h = newSigningHasher();
  h.update(varBytes(tx.payload));
  return h.digest();
}

/** Computes the Schnorr signature hash for input[inputIndex] with SIG_HASH_ALL. */
function calcSchnorrSigHash(tx: TxForSigning, inputIndex: number): Uint8Array {
  const inp = tx.inputs[inputIndex];
  const h = newSigningHasher();

  h.update(u16LE(tx.version));
  h.update(previousOutputsHash(tx));
  h.update(sequencesHash(tx));
  h.update(sigOpCountsHash(tx));

  // This input's outpoint
  h.update(hexToBytes(inp.transaction_id));
  h.update(u32LE(inp.index));

  // This input's UTXO scriptPublicKey
  h.update(u16LE(inp.utxo.script_version));
  h.update(varBytes(hexToBytes(inp.utxo.script_public_key)));

  // Amount + sequence + sig_op_count for this input
  h.update(u64LE(BigInt(inp.utxo.amount_sompi)));
  h.update(u64LE(inp.sequence));
  h.update(new Uint8Array([inp.sig_op_count]));

  h.update(outputsHash(tx));
  h.update(u64LE(tx.lock_time));
  h.update(hexToBytes(tx.subnetwork_id));
  h.update(u64LE(tx.gas));
  h.update(payloadHash(tx));
  h.update(new Uint8Array([SIG_HASH_ALL]));

  return h.digest();
}

// ── Transaction building & signing ────────────────────────────────────────────

export interface Utxo {
  address: string;
  transaction_id: string;
  index: number;
  amount_sompi: number;
  script_version: number;
  script_public_key: string;
  block_daa_score: number;
  is_coinbase: boolean;
}

export interface BuildTxResult {
  tx: SignedTx;
  totalIn: number;
  totalOut: number;
  fee: number;
}

export interface SignedTx {
  version: number;
  inputs: TxInputSigned[];
  outputs: TxOutputSigned[];
  lock_time: number;
  subnetwork_id: string;
  gas: number;
  payload: string;
}

export interface TxInputSigned {
  transaction_id: string;
  index: number;
  signature_script: string; // hex
  sequence: string; // u64 as string (for JSON)
  sig_op_count: number;
}

export interface TxOutputSigned {
  amount: number;
  script_version: number;
  script_public_key: string; // hex
}

/**
 * Builds and signs a P2PK transaction.
 *
 * @param utxos       Available UTXOs for the sender address
 * @param recipient   Keryx address of the recipient
 * @param amountSompi Amount to send (excluding fee)
 * @param feeSompi    Fee in sompi
 * @param changeAddr  Keryx address for change (usually same as sender)
 * @param privateKeyHex Sender's private key (32-byte hex)
 * @param publicKeyHex  Sender's compressed public key (33-byte hex)
 */
export function buildAndSignTx(
  utxos: Utxo[],
  recipient: string,
  amountSompi: number,
  feeSompi: number,
  changeAddr: string,
  privateKeyHex: string,
  publicKeyHex: string,
  currentDaaScore = 0
): BuildTxResult {
  const needed = amountSompi + feeSompi;

  // Sort UTXOs: oldest first (lowest block_daa_score = most confirmed)
  const sorted = [...utxos].sort((a, b) => a.block_daa_score - b.block_daa_score);

  const selected: Utxo[] = [];
  let totalIn = 0;
  for (const u of sorted) {
    // Skip coinbase outputs that have not yet reached maturity.
    if (u.is_coinbase && currentDaaScore > 0 && u.block_daa_score + COINBASE_MATURITY > currentDaaScore) continue;
    selected.push(u);
    totalIn += u.amount_sompi;
    if (totalIn >= needed) break;
  }

  if (totalIn < needed) {
    throw new Error(
      `Insufficient funds: have ${totalIn} sompi, need ${needed} sompi (amount + fee)`
    );
  }

  const change = totalIn - amountSompi - feeSompi;

  // Build outputs
  const outputs: TxOutputSigned[] = [
    {
      amount: amountSompi,
      script_version: 0,
      script_public_key: addressToScriptHex(recipient),
    },
  ];
  if (change > 0) {
    outputs.push({
      amount: change,
      script_version: 0,
      script_public_key: addressToScriptHex(changeAddr),
    });
  }

  // Build unsigned inputs
  const txForSigning: TxForSigning = {
    version: TX_VERSION,
    inputs: selected.map((u) => ({
      transaction_id: u.transaction_id,
      index: u.index,
      sequence: MAX_SEQUENCE,
      sig_op_count: 1,
      utxo: {
        amount_sompi: u.amount_sompi,
        script_version: u.script_version,
        script_public_key: u.script_public_key,
      },
    })),
    outputs: outputs.map((o) => ({
      amount: o.amount,
      script_version: o.script_version,
      script_public_key: o.script_public_key,
    })),
    lock_time: 0n,
    subnetwork_id: SUBNETWORK_ID_NATIVE,
    gas: 0n,
    payload: new Uint8Array(0),
  };

  const privKey = hexToBytes(privateKeyHex);

  // Sign each input
  const signedInputs: TxInputSigned[] = selected.map((u, i) => {
    const sigHash = calcSchnorrSigHash(txForSigning, i);
    const sig = schnorr.sign(sigHash, privKey);
    const sigScript = buildSigScript(sig, SIG_HASH_ALL);

    return {
      transaction_id: u.transaction_id,
      index: u.index,
      signature_script: Buffer.from(sigScript).toString("hex"),
      sequence: MAX_SEQUENCE.toString(),
      sig_op_count: 1,
    };
  });

  return {
    tx: {
      version: TX_VERSION,
      inputs: signedInputs,
      outputs,
      lock_time: 0,
      subnetwork_id: SUBNETWORK_ID_NATIVE,
      gas: 0,
      payload: "",
    },
    totalIn,
    totalOut: amountSompi,
    fee: feeSompi,
  };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function sompiToKrx(sompi: number): string {
  return (sompi / 1e8).toFixed(8).replace(/\.?0+$/, "") || "0";
}

export function krxToSompi(krx: string): number {
  return Math.round(parseFloat(krx) * 1e8);
}
