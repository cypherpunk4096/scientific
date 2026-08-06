"use strict";
/*!
 * apikeys.js — block-scanner API key layer (PROTOTYPE lane · UMD · window.DVKeys).
 *
 * An API key is an UPGRADE to blockchain interaction: higher rate limits + more endpoints from the
 * scanner. It is a POWER granted by the operator — never required (every call degrades to the public
 * endpoint without one). Best practice, enforced here:
 *   • keys are NEVER hardcoded or committed (load from env / localStorage / explicit set);
 *   • one key per SCANNER FAMILY — Etherscan V2 uses a SINGLE key across all etherscan chains; a
 *     per-chain override wins when set; Blockscout chains usually need none;
 *   • resolution always falls back to null (public).
 *
 * Sources (priority): explicit set() → localStorage (browser) → env (node) → none (public).
 * Pairs with the production lane apikeys.ts / apikeys.tsx. Script-style (no import/export).
 */
(function (global) {
  "use strict";

  var LS_KEY = "dv.scanner.keys";
  // { etherscan: "KEY", blockscout: "KEY", solana: "KEY", perChain: { "1": "KEY" } }
  var STORE = { perChain: {} };

  function isBrowser() { return typeof window !== "undefined" && !!window.localStorage; }

  function load() {
    // env first (node) — DV_ETHERSCAN_KEY / DV_BLOCKSCOUT_KEY / DV_SOLANA_KEY / DV_SCANNER_KEY_<chainId>
    if (typeof process !== "undefined" && process.env) {
      var e = process.env;
      if (e.DV_ETHERSCAN_KEY) STORE.etherscan = e.DV_ETHERSCAN_KEY;
      if (e.ETHERSCAN_API_KEY && !STORE.etherscan) STORE.etherscan = e.ETHERSCAN_API_KEY;
      if (e.DV_BLOCKSCOUT_KEY) STORE.blockscout = e.DV_BLOCKSCOUT_KEY;
      if (e.DV_SOLANA_KEY) STORE.solana = e.DV_SOLANA_KEY;
      if (e.DV_ALCHEMY_KEY) STORE.alchemy = e.DV_ALCHEMY_KEY;   // RPC provider upgrade (DVProviders); not a scanner
      for (var k in e) { var m = /^DV_SCANNER_KEY_(\d+)$/.exec(k); if (m) STORE.perChain[m[1]] = e[k]; }
    }
    // localStorage (browser) overrides/augments
    if (isBrowser()) {
      try { var s = JSON.parse(window.localStorage.getItem(LS_KEY) || "{}"); Object.assign(STORE, s); STORE.perChain = Object.assign(STORE.perChain || {}, s.perChain || {}); } catch (e) {}
    }
    return STORE;
  }

  function persist() { if (isBrowser()) { try { window.localStorage.setItem(LS_KEY, JSON.stringify(STORE)); } catch (e) {} } }

  // set a key. scope = "etherscan" | "blockscout" | "solana" | a chainId string (per-chain override).
  function set(scope, value) {
    if (/^\d/.test(String(scope))) { STORE.perChain[String(scope)] = value || undefined; }
    else { STORE[scope] = value || undefined; }
    persist(); return STORE;
  }
  function clear(scope) { return set(scope, ""); }

  // resolve the key for a chain: per-chain override → scanner-family key → null (public).
  function resolve(chainId, apiKind) {
    var pc = STORE.perChain && STORE.perChain[String(chainId)];
    if (pc) return pc;
    if (apiKind === "etherscan-v2" || apiKind === "etherscan") return STORE.etherscan || null;
    if (apiKind === "blockscout") return STORE.blockscout || null;
    if (apiKind === "solana") return STORE.solana || null;
    if (apiKind === "alchemy") return STORE.alchemy || null;   // RPC provider key (optional upgrade)
    return null;   // public — no key needed
  }

  function has(chainId, apiKind) { return !!resolve(chainId, apiKind); }
  function mask(v) { return v ? (v.slice(0, 4) + "…" + v.slice(-3)) : ""; }
  function snapshot() { return { etherscan: mask(STORE.etherscan), blockscout: mask(STORE.blockscout), solana: mask(STORE.solana), alchemy: mask(STORE.alchemy), perChain: Object.keys(STORE.perChain || {}) }; }

  load();
  global.DVKeys = { load: load, set: set, clear: clear, resolve: resolve, has: has, mask: mask, snapshot: snapshot };
  if (typeof module !== "undefined" && module.exports) module.exports = global.DVKeys;
})(typeof window !== "undefined" ? window : globalThis);
