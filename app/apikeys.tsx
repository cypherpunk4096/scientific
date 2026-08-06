/*!
 * apikeys.tsx — scanner API key manager (PRODUCTION lane · React + strict TS).
 *
 * The UI for the API-key POWER UPGRADE: enter a scanner key (Etherscan V2 = one key for every
 * etherscan chain; Blockscout; Solana) or a per-chain override; keys are masked, stored locally
 * (localStorage) — NEVER committed — and resolved by the template's explorer calls. Without a key
 * everything still works on the public endpoint; a key just lifts the rate limit and unlocks more
 * endpoints. Pairs with apikeys.ts / apikeys.js.
 */
import React, { useState } from "react";
import * as Keys from "./apikeys";
import "./scientific.css";

export interface KeyManagerProps { chains?: { chainId: number; name: string; apiKind: Keys.ScannerKind }[]; onChange?: () => void }

export function ApiKeyManager({ chains = [], onChange }: KeyManagerProps) {
  const [snap, setSnap] = useState(Keys.snapshot());
  const [draft, setDraft] = useState<Record<string, string>>({});
  const save = (scope: string) => { Keys.set(scope, draft[scope] ?? ""); setDraft({ ...draft, [scope]: "" }); setSnap(Keys.snapshot()); onChange?.(); };

  const Row = ({ scope, label, current }: { scope: string; label: string; current?: string }) => (
    <div className="sci-call write">
      <span className="fn">{label}</span>
      <input type="password" placeholder={current ? `set (${current})` : "paste key — optional, public works without"}
             value={draft[scope] ?? ""} onChange={(e) => setDraft({ ...draft, [scope]: e.target.value })} />
      <button onClick={() => save(scope)}>save</button>
      {current && <button className="sci-refresh" onClick={() => { Keys.clear(scope); setSnap(Keys.snapshot()); onChange?.(); }}>clear</button>}
    </div>
  );

  return (
    <div className="sci">
      <header className="sci-head">
        <h2>scanner keys <span className="sci-sym">power upgrade</span></h2>
        <span className="sci-badges"><span className="sci-badge unknown">optional · public works without</span></span>
      </header>
      <p className="sci-note">A key lifts the scanner rate limit + unlocks endpoints. Stored locally
        (never committed). One Etherscan-V2 key covers every etherscan chain; per-chain overrides win.</p>
      <div className="sci-section open"><div className="sci-section-body">
        <Row scope="etherscan" label="Etherscan V2 (all etherscan chains)" current={snap.etherscan} />
        <Row scope="blockscout" label="Blockscout" current={snap.blockscout} />
        <Row scope="solana" label="Solana (Solana.fm)" current={snap.solana} />
        {chains.map((c) => <Row key={c.chainId} scope={String(c.chainId)} label={`${c.name} (#${c.chainId}) override`} current={snap.perChain.includes(String(c.chainId)) ? "set" : ""} />)}
      </div></div>
    </div>
  );
}

export default ApiKeyManager;
