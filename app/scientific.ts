/*!
 * scientific.ts — SCIENTIFIC single-contract interaction (PRODUCTION lane · strict TypeScript).
 *
 * The value-moving lane. Same surface as scientific.js but typed end-to-end: every input field of
 * the deployed contract, live reads, signed writes, verification loopbacks (is-live / abi-matches /
 * genesis-mint), and a parsec-style transaction-history feed. `ethers` is cast `any` at the boundary
 * (the vendored SDK owns its shapes). Compiles to scientific.js-compatible output for the prototype
 * lane. See docs/CONVENTIONS.md and ../docs/standards/ (ERC-20).
 */
import abiJson from "./scientific.abi" assert { type: "json" };

declare const window: any;
const E = (): any => {
  const e = (typeof window !== "undefined" ? window.ethers : (globalThis as any).ethers);
  if (!e) throw new Error("ethers not loaded (vendor/ethers.umd.min.js)");
  return e;
};

export const ABI: any[] = abiJson as any[];

export interface Snapshot {
  address: string; name: string; symbol: string; decimals: number;
  totalSupply: string; overlord: string; balanceOf?: string;
}
export interface VerifyReport {
  isLive: boolean; genesisMint: boolean; abiMatches: { ok: boolean; missing: string[] } | null;
}
export interface TxRow {
  hash: string; from: string; to: string; value: string; ts?: number; ok?: boolean;
  method?: string; block?: number; explorer?: string;
}

const EXPLORER_API: Record<number, string> = { 1: "https://api.etherscan.io/api", 8453: "https://api.basescan.org/api" };
const EXPLORER_TX: Record<number, string> = { 1: "https://etherscan.io/tx/", 8453: "https://basescan.org/tx/" };

const rpc = (url: string): any => new (E()).JsonRpcProvider(url);
const at = (address: string, rpcUrl: string): any => new (E()).Contract(address, ABI, rpc(rpcUrl));

async function signer(address: string): Promise<any> {
  if (!window?.ethereum) throw new Error("no EVM wallet — connect MetaMask/Phantom");
  const s = await new (E()).BrowserProvider(window.ethereum).getSigner();
  return new (E()).Contract(address, ABI, s);
}

// ── live reads ──
export async function snapshot(address: string, rpcUrl: string, who?: string): Promise<Snapshot> {
  const c = at(address, rpcUrl);
  const out: Snapshot = {
    address, name: await c.name(), symbol: await c.symbol(), decimals: Number(await c.decimals()),
    totalSupply: (await c.totalSupply()).toString(), overlord: await c.overlord(),
  };
  if (who) out.balanceOf = (await c.balanceOf(who)).toString();
  return out;
}
export const balanceOf = async (a: string, r: string, who: string): Promise<string> => (await at(a, r).balanceOf(who)).toString();
export const allowance = async (a: string, r: string, o: string, s: string): Promise<string> => (await at(a, r).allowance(o, s)).toString();

// ── signed writes ──
export const transfer = async (a: string, to: string, v: bigint) => (await (await signer(a)).transfer(to, v)).wait();
export const approve = async (a: string, sp: string, v: bigint) => (await (await signer(a)).approve(sp, v)).wait();
export const transferFrom = async (a: string, f: string, to: string, v: bigint) => (await (await signer(a)).transferFrom(f, to, v)).wait();
export const transferOverlord = async (a: string, to: string) => (await (await signer(a)).transferOverlord(to)).wait();

// ── verification loopbacks ──
export async function verify(address: string, rpcUrl: string, chainId: number): Promise<VerifyReport> {
  const code: string = await rpc(rpcUrl).getCode(address);
  const isLive = !!code && code !== "0x";
  let genesisMint = false;
  try {
    const c = at(address, rpcUrl);
    const ov = await c.overlord();
    genesisMint = (await c.balanceOf(ov)).toString() === (await c.totalSupply()).toString();
  } catch { /* not live */ }
  return { isLive, genesisMint, abiMatches: await abiMatches(address, chainId) };
}

/**
 * ONE public call to the block scanner (Etherscan/Blockscout) to collect the deployed contract's
 * verified ABI. WITH OR WITHOUT an api key (public endpoint; a key only raises the rate limit).
 * This single call is the interaction surface; the bundled scientific.abi is the loopback's expected.
 */
export async function fetchExplorerAbi(address: string, chainId: number, apiKey?: string): Promise<any[] | null> {
  const base = EXPLORER_API[chainId]; if (!base) return null;
  const sep = base.includes("?") ? "&" : "?";
  const j: any = await (await fetch(`${base}${sep}module=contract&action=getabi&address=${address}${apiKey ? `&apikey=${apiKey}` : ""}`)).json();
  return j.status === "1" ? JSON.parse(j.result) : null;
}
/** Resolve the ABI to drive the UI: the one public-fetched deployed ABI, or the bundled fallback. */
export async function loadAbi(address: string, chainId: number, apiKey?: string): Promise<any[]> {
  return (await fetchExplorerAbi(address, chainId, apiKey)) || ABI;
}
export async function abiMatches(address: string, chainId: number, apiKey?: string): Promise<{ ok: boolean; missing: string[] } | null> {
  const on = await fetchExplorerAbi(address, chainId, apiKey); if (!on) return null;
  const want = new Set(ABI.filter((x) => x.type === "function" || x.type === "event").map((x) => x.name));
  const got = new Set(on.filter((x) => x.type === "function" || x.type === "event").map((x) => x.name));
  const missing = [...want].filter((n) => !got.has(n));
  return { ok: missing.length === 0, missing };
}

// ── transaction history (parsec-style) ──
export async function txHistory(address: string, chainId: number, opts: { limit?: number; apiKey?: string; rpcUrl?: string; fromBlock?: number } = {}): Promise<TxRow[]> {
  const base = EXPLORER_API[chainId];
  if (base) {
    try {
      const url = `${base}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=${opts.limit ?? 25}${opts.apiKey ? `&apikey=${opts.apiKey}` : ""}`;
      const j: any = await (await fetch(url)).json();
      if (j.status === "1") return j.result.map((t: any): TxRow => ({
        hash: t.hash, from: t.from, to: t.to, value: t.value, ts: Number(t.timeStamp),
        ok: t.isError === "0", method: t.functionName || t.input.slice(0, 10), explorer: explorerTx(chainId, t.hash),
      }));
    } catch { /* fall through */ }
  }
  const c = at(address, opts.rpcUrl ?? "");
  const evs = await c.queryFilter(c.filters.Transfer(), opts.fromBlock ?? 0);
  return evs.reverse().map((e: any): TxRow => ({ hash: e.transactionHash, from: e.args[0], to: e.args[1], value: e.args[2].toString(), block: e.blockNumber, method: "Transfer" }));
}
export const explorerTx = (chainId: number, hash: string): string => (EXPLORER_TX[chainId] ? EXPLORER_TX[chainId] + hash : "");

/**
 * The contract-creation transaction — the GENESIS of the feedback loop. SCIENTIFIC is the
 * measurement origin (stage E1, first-light); every deploy is measured from its own creation tx,
 * and the whole stack is organized/measured from SCIENTIFIC's first deploy. The history feed anchors
 * here and the refresh loop polls forward from the deploy block.
 */
export async function deployTx(address: string, chainId: number, apiKey?: string): Promise<TxRow | null> {
  const base = EXPLORER_API[chainId]; if (!base) return null;
  try {
    const sep = base.includes("?") ? "&" : "?";
    const j: any = await (await fetch(`${base}${sep}module=contract&action=getcontractcreation&contractaddresses=${address}${apiKey ? `&apikey=${apiKey}` : ""}`)).json();
    if (j.status === "1" && j.result?.[0]) {
      const r = j.result[0];
      return { hash: r.txHash, from: r.contractCreator, to: address, value: "0", method: "⟐ deploy", ok: true, block: Number(r.blockNumber ?? 0), explorer: explorerTx(chainId, r.txHash) };
    }
  } catch { /* scanner may lack getcontractcreation */ }
  return null;
}

// ── single-contract handoff deploy: arm → launch ──
export async function deploy(bytecode: string, overlord: string): Promise<string> {
  if (!window?.ethereum) throw new Error("no EVM wallet");
  const s = await new (E()).BrowserProvider(window.ethereum).getSigner();
  const c = await new (E()).ContractFactory(ABI, bytecode, s).deploy(overlord);
  await c.waitForDeployment();
  return await c.getAddress();
}
