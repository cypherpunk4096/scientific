/*!
 * scientific.tsx — SCIENTIFIC single-contract handoff UI (PRODUCTION lane · React + strict TS).
 *
 * Operate a DEPLOYED contract from the SCIENTIFIC deploy template: a live snapshot, verification
 * LOOPBACK badges (is-live / abi-matches / genesis-mint), an ABI-driven form with **every input
 * field**, and a parsec-style transaction-history feed. Multi-deploy is **contained in accordions**
 * (one collapsible per deploy); within each panel the reads / writes / history are **collapsible
 * toggles**. All chain access goes through scientific.ts; explorers resolve per-chain from the
 * registry. Styling: scientific.css (web). Terminal twin: scientific.tcss.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as SCI from "./scientific";
import "./scientific.css";

type Field = { name: string; type: string };
type AbiFn = { name: string; stateMutability: string; inputs: Field[] };

const readFns = (abi: any[]): AbiFn[] => abi.filter((x) => x.type === "function" && (x.stateMutability === "view" || x.stateMutability === "pure"));
const writeFns = (abi: any[]): AbiFn[] => abi.filter((x) => x.type === "function" && x.stateMutability !== "view" && x.stateMutability !== "pure");

/* ─────────────── accordion (contain each deploy) ─────────────── */

export interface Deploy { address: string; rpcUrl: string; chainId: number; account?: string; label?: string }

/** ScientificDeploys — an accordion of deploys; each row expands to its ScientificPanel. */
export function ScientificDeploys({ deploys, single }: { deploys: Deploy[]; single?: boolean }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => (deploys[0] ? { [key(deploys[0])]: true } : {}));
  const toggle = (k: string) => setOpen((o) => (single ? { [k]: !o[k] } : { ...o, [k]: !o[k] }));
  return (
    <div className="sci-acc">
      {deploys.map((d) => {
        const k = key(d);
        return (
          <div className={`sci-acc-item ${open[k] ? "open" : ""}`} key={k}>
            <button className="sci-acc-head" onClick={() => toggle(k)} aria-expanded={open[k]}>
              <span className="chev">{open[k] ? "▾" : "▸"}</span>
              <span className="lbl">{d.label ?? "SCIENTIFIC"}</span>
              <code className="addr">{d.address.slice(0, 8)}…{d.address.slice(-6)}</code>
              <span className="cid">chain {d.chainId}</span>
            </button>
            {open[k] && <div className="sci-acc-body"><ScientificPanel {...d} /></div>}
          </div>
        );
      })}
    </div>
  );
}
const key = (d: Deploy) => `${d.chainId}:${d.address}`;

/* ─────────────── collapsible section toggle ─────────────── */

function Section({ title, count, defaultOpen, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div className={`sci-section ${open ? "open" : ""}`}>
      <button className="sci-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="chev">{open ? "▾" : "▸"}</span><span className="t">{title}</span>
        {count != null && <span className="n">{count}</span>}
      </button>
      {open && <div className="sci-section-body">{children}</div>}
    </div>
  );
}

/* ─────────────── per-deploy panel ─────────────── */

export interface ScientificPanelProps { address: string; rpcUrl: string; chainId: number; account?: string }

export function ScientificPanel({ address, rpcUrl, chainId, account }: ScientificPanelProps) {
  const abi = SCI.ABI;
  const [snap, setSnap] = useState<SCI.Snapshot | null>(null);
  const [verify, setVerify] = useState<SCI.VerifyReport | null>(null);
  const [txs, setTxs] = useState<SCI.TxRow[]>([]);
  const [deploy, setDeploy] = useState<SCI.TxRow | null>(null);   // the genesis tx — measured from SCIENTIFIC
  const [busy, setBusy] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const reads = useMemo(() => readFns(abi), [abi]);
  const writes = useMemo(() => writeFns(abi), [abi]);

  const refresh = useCallback(async () => {
    setErr("");
    try {
      setSnap(await SCI.snapshot(address, rpcUrl, account));
      setVerify(await SCI.verify(address, rpcUrl, chainId));            // loopbacks
      setDeploy(await SCI.deployTx(address, chainId));                 // genesis anchor (measure from SCIENTIFIC)
      setTxs(await SCI.txHistory(address, chainId, { rpcUrl, limit: 25 }));
    } catch (e: any) { setErr(String(e?.message ?? e)); }
  }, [address, rpcUrl, chainId, account]);

  useEffect(() => { refresh(); const t = setInterval(refresh, 15000); return () => clearInterval(t); }, [refresh]);

  const onWrite = useCallback(async (fn: AbiFn, args: Record<string, string>) => {
    setBusy(fn.name); setErr("");
    try {
      const a = address;
      if (fn.name === "transfer") await SCI.transfer(a, args.to, BigInt(args.value));
      else if (fn.name === "approve") await SCI.approve(a, args.spender, BigInt(args.value));
      else if (fn.name === "transferFrom") await SCI.transferFrom(a, args.from, args.to, BigInt(args.value));
      else if (fn.name === "transferOverlord") await SCI.transferOverlord(a, args.to);
      await refresh();
    } catch (e: any) { setErr(String(e?.message ?? e)); } finally { setBusy(""); }
  }, [address, refresh]);

  return (
    <div className="sci">
      <header className="sci-head">
        <h2>{snap?.name ?? "SCIENTIFIC"} <span className="sci-sym">{snap?.symbol ?? ""}</span></h2>
        <code className="sci-addr">{address}</code>
        <Badges verify={verify} />
        <button className="sci-refresh" onClick={refresh}>↻ live</button>
      </header>

      {err && <div className="sci-err">{err}</div>}

      <Section title="state" defaultOpen>
        <div className="sci-snap">
          <Kv k="name" v={snap?.name} /><Kv k="symbol" v={snap?.symbol} />
          <Kv k="decimals" v={snap?.decimals} /><Kv k="totalSupply" v={snap?.totalSupply} />
          <Kv k="overlord" v={snap?.overlord} mono /><Kv k="your balance" v={snap?.balanceOf} />
        </div>
      </Section>

      <Section title="reads" count={reads.length} defaultOpen={false}>
        {reads.map((fn) => <ReadCall key={fn.name} fn={fn} address={address} rpcUrl={rpcUrl} account={account} />)}
      </Section>

      <Section title="writes" count={writes.length} defaultOpen={false}>
        {writes.map((fn) => <WriteCall key={fn.name} fn={fn} busy={busy === fn.name} onSubmit={(a) => onWrite(fn, a)} />)}
      </Section>

      <Section title="transaction history" count={txs.length} defaultOpen={false}>
        <ul className="sci-txlist">
          {txs.map((t) => (
            <li key={t.hash} className={t.ok === false ? "fail" : "ok"}>
              <span className="m">{t.method ?? "—"}</span>
              <a className="h" href={t.explorer || "#"} target="_blank" rel="noreferrer">{t.hash.slice(0, 10)}…</a>
              <span className="v">{t.value}</span>
              {t.ts && <time>{new Date(t.ts * 1000).toLocaleString()}</time>}
            </li>
          ))}
          {txs.length === 0 && <li className="empty">no transactions yet</li>}
          {deploy && (
            <li className="deploy" title="contract-creation tx — the genesis of the feedback loop">
              <span className="m">{deploy.method}</span>
              <a className="h" href={deploy.explorer || "#"} target="_blank" rel="noreferrer">{deploy.hash.slice(0, 10)}…</a>
              <span className="origin">measured from SCIENTIFIC</span>
            </li>
          )}
        </ul>
      </Section>
    </div>
  );
}

function Badges({ verify }: { verify: SCI.VerifyReport | null }) {
  if (!verify) return <span className="sci-badges">…verifying</span>;
  const b = (ok: boolean | null, label: string) => (
    <span className={`sci-badge ${ok == null ? "unknown" : ok ? "ok" : "bad"}`}>{ok == null ? "?" : ok ? "✓" : "✗"} {label}</span>
  );
  return (
    <span className="sci-badges">
      {b(verify.isLive, "live")}
      {b(verify.abiMatches ? verify.abiMatches.ok : null, "abi")}
      {b(verify.genesisMint, "genesis")}
    </span>
  );
}

function Kv({ k, v, mono }: { k: string; v: any; mono?: boolean }) {
  return <div className="sci-kv"><span className="k">{k}</span><span className={`val${mono ? " mono" : ""}`}>{v ?? "…"}</span></div>;
}

function ReadCall({ fn, address, rpcUrl, account }: { fn: AbiFn; address: string; rpcUrl: string; account?: string }) {
  const [args, setArgs] = useState<Record<string, string>>(() => Object.fromEntries(fn.inputs.map((i, n) => [i.name || `arg${n}`, n === 0 && i.type === "address" ? account ?? "" : ""])));
  const [out, setOut] = useState<string>("");
  const run = async () => {
    try {
      if (fn.name === "balanceOf") setOut(await SCI.balanceOf(address, rpcUrl, args[fn.inputs[0].name || "arg0"]));
      else if (fn.name === "allowance") setOut(await SCI.allowance(address, rpcUrl, args[fn.inputs[0].name || "arg0"], args[fn.inputs[1].name || "arg1"]));
      else { const s = await SCI.snapshot(address, rpcUrl); setOut(String((s as any)[fn.name] ?? "ok")); }
    } catch (e: any) { setOut("err: " + (e?.message ?? e)); }
  };
  return (
    <div className="sci-call read">
      <span className="fn">{fn.name}</span>
      {fn.inputs.map((i, n) => <input key={n} placeholder={`${i.type} ${i.name}`} value={args[i.name || `arg${n}`] ?? ""} onChange={(e) => setArgs({ ...args, [i.name || `arg${n}`]: e.target.value })} />)}
      <button onClick={run}>read</button>
      {out && <code className="out">{out}</code>}
    </div>
  );
}

function WriteCall({ fn, busy, onSubmit }: { fn: AbiFn; busy: boolean; onSubmit: (a: Record<string, string>) => void }) {
  const [args, setArgs] = useState<Record<string, string>>(() => Object.fromEntries(fn.inputs.map((i, n) => [i.name || `arg${n}`, ""])));
  return (
    <div className="sci-call write">
      <span className="fn">{fn.name}</span>
      {fn.inputs.map((i, n) => <input key={n} placeholder={`${i.type} ${i.name}`} value={args[i.name || `arg${n}`] ?? ""} onChange={(e) => setArgs({ ...args, [i.name || `arg${n}`]: e.target.value })} />)}
      <button disabled={busy} onClick={() => onSubmit(args)}>{busy ? "…" : "send"}</button>
    </div>
  );
}

export default ScientificDeploys;
