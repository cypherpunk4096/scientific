/*!
 * apikeys.ts — block-scanner API key layer (PRODUCTION lane · strict TypeScript).
 *
 * The API key UPGRADES blockchain interaction (rate limit + endpoints) and is a POWER the operator
 * grants — never required (public fallback always). Best practice, typed: keys are never hardcoded
 * or committed; loaded from env / localStorage / explicit set; one key per scanner family
 * (Etherscan V2 = one key for all etherscan chains), with per-chain overrides; resolution falls back
 * to `null` (public). Production twin of apikeys.js; the UI is apikeys.tsx.
 */
export type ScannerKind = "etherscan-v2" | "etherscan" | "blockscout" | "solana" | "generic";
export interface KeyStore {
  etherscan?: string; blockscout?: string; solana?: string;
  perChain: Record<string, string>;
}

const LS_KEY = "dv.scanner.keys";
const STORE: KeyStore = { perChain: {} };
const isBrowser = (): boolean => typeof window !== "undefined" && !!(window as any).localStorage;

export function load(): KeyStore {
  const env: any = (typeof process !== "undefined" && (process as any).env) || {};
  if (env.DV_ETHERSCAN_KEY) STORE.etherscan = env.DV_ETHERSCAN_KEY;
  else if (env.ETHERSCAN_API_KEY) STORE.etherscan = env.ETHERSCAN_API_KEY;
  if (env.DV_BLOCKSCOUT_KEY) STORE.blockscout = env.DV_BLOCKSCOUT_KEY;
  if (env.DV_SOLANA_KEY) STORE.solana = env.DV_SOLANA_KEY;
  for (const k of Object.keys(env)) { const m = /^DV_SCANNER_KEY_(\d+)$/.exec(k); if (m) STORE.perChain[m[1]] = env[k]; }
  if (isBrowser()) {
    try { const s = JSON.parse((window as any).localStorage.getItem(LS_KEY) || "{}"); Object.assign(STORE, s); STORE.perChain = { ...STORE.perChain, ...(s.perChain || {}) }; } catch { /* ignore */ }
  }
  return STORE;
}

const persist = (): void => { if (isBrowser()) { try { (window as any).localStorage.setItem(LS_KEY, JSON.stringify(STORE)); } catch { /* ignore */ } } };

/** Set a key. `scope` = "etherscan" | "blockscout" | "solana" | a chainId (per-chain override). */
export function set(scope: string, value: string): KeyStore {
  if (/^\d/.test(scope)) STORE.perChain[scope] = value || "";
  else (STORE as any)[scope] = value || "";
  persist(); return STORE;
}
export const clear = (scope: string): KeyStore => set(scope, "");

/** Resolve the key for a chain: per-chain override → scanner-family key → null (public). */
export function resolve(chainId: number | string, apiKind: ScannerKind): string | null {
  const pc = STORE.perChain[String(chainId)];
  if (pc) return pc;
  if (apiKind === "etherscan-v2" || apiKind === "etherscan") return STORE.etherscan || null;
  if (apiKind === "blockscout") return STORE.blockscout || null;
  if (apiKind === "solana") return STORE.solana || null;
  return null; // public
}
export const has = (chainId: number | string, apiKind: ScannerKind): boolean => !!resolve(chainId, apiKind);
export const mask = (v?: string): string => (v ? `${v.slice(0, 4)}…${v.slice(-3)}` : "");
export const snapshot = () => ({ etherscan: mask(STORE.etherscan), blockscout: mask(STORE.blockscout), solana: mask(STORE.solana), perChain: Object.keys(STORE.perChain) });

load();
export default { load, set, clear, resolve, has, mask, snapshot };
