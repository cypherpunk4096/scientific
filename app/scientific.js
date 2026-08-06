"use strict";
/*!
 * scientific.js — SCIENTIFIC single-contract interaction (PROTOTYPE lane · UMD · window.ethers).
 *
 * Drives every input field of the DEPLOYED SCIENTIFIC contract from scientific.abi, with:
 *   • live reads over chain RPC (name/symbol/decimals/totalSupply/overlord/balanceOf/allowance),
 *   • writes via the connected wallet (transfer/approve/transferFrom/transferOverlord),
 *   • verification LOOPBACKS that prove the contract is live and its on-chain ABI matches,
 *   • transaction-history feedback for the UI, parsec/parsec-wallet style.
 *
 * Two-lane: this .js is the prototype; the strict-TS production lane is scientific.ts. Anything
 * that signs/moves value should run through the production lane. Requires window.ethers
 * (vendor/ethers.umd.min.js). Script-style (no import/export). See docs/CONVENTIONS.md.
 */
(function (global) {
  "use strict";

  function E() {
    if (!global.ethers) throw new Error("ethers not loaded (vendor/ethers.umd.min.js)");
    return global.ethers;
  }

  // The ABI ships alongside; the UI also re-fetches from the explorer and loops back to verify.
  var ABI = (global.SCIENTIFIC_ABI) || [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function TOTAL_SUPPLY() view returns (uint256)",
    "function overlord() view returns (address)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function transfer(address to, uint256 value) returns (bool)",
    "function approve(address spender, uint256 value) returns (bool)",
    "function transferFrom(address from, address to, uint256 value) returns (bool)",
    "function transferOverlord(address to)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
    "event OverlordTransferred(address indexed from, address indexed to)"
  ];

  // Chain/explorer awareness — resolved from the registry (deploy/explorers.json, sourced from
  // deploy/chains.json + agenticplace.pythai.net/allchain.html + ~/chainmarketcap blockscout-sync).
  // Load it as window.DV_EXPLORERS; Blockscout and Etherscan-V2 share the module/action query, so
  // only the base URL differs per chain — every deploy thus knows its own scanner.
  function registry() { return (global.DV_EXPLORERS && global.DV_EXPLORERS.explorers) || {}; }
  function explorerOf(chainId) { return registry()[String(chainId)] || null; }
  function explorerApi(chainId) { var e = explorerOf(chainId); return e ? e.api : null; }
  // resolve the scanner API key (the upgrade) for this chain via DVKeys — null = public.
  function keyFor(chainId) { var e = explorerOf(chainId); return (global.DVKeys && e) ? global.DVKeys.resolve(chainId, e.apiKind) : null; }
  function apiQuery(base, params) {
    var sep = base.indexOf("?") >= 0 ? "&" : "?";   // etherscan-v2 base already carries ?chainid=N
    return base + sep + params;
  }

  function rpcProvider(rpcUrl) { return new (E()).JsonRpcProvider(rpcUrl); }
  function walletProvider() {
    if (!global.ethereum) throw new Error("no EVM wallet — connect MetaMask/Phantom");
    return new (E()).BrowserProvider(global.ethereum);
  }

  // read-only contract bound to a chain RPC
  function at(address, rpcUrl) { return new (E()).Contract(address, ABI, rpcProvider(rpcUrl)); }

  // ── live reads: every view field of the deployed contract ──
  async function snapshot(address, rpcUrl, who) {
    var c = at(address, rpcUrl);
    var out = {
      address: address,
      name: await c.name(), symbol: await c.symbol(),
      decimals: Number(await c.decimals()),
      totalSupply: (await c.totalSupply()).toString(),
      overlord: await c.overlord()
    };
    if (who) out.balanceOf = (await c.balanceOf(who)).toString();
    return out;
  }
  async function balanceOf(address, rpcUrl, who) { return (await at(address, rpcUrl).balanceOf(who)).toString(); }
  async function allowance(address, rpcUrl, owner, spender) {
    return (await at(address, rpcUrl).allowance(owner, spender)).toString();
  }

  // ── writes: signed by the connected wallet ──
  async function withSigner(address) {
    var p = walletProvider(); var s = await p.getSigner();
    return new (E()).Contract(address, ABI, s);
  }
  async function transfer(address, to, value) { var c = await withSigner(address); return (await c.transfer(to, value)).wait(); }
  async function approve(address, spender, value) { var c = await withSigner(address); return (await c.approve(spender, value)).wait(); }
  async function transferFrom(address, from, to, value) { var c = await withSigner(address); return (await c.transferFrom(from, to, value)).wait(); }
  async function transferOverlord(address, to) { var c = await withSigner(address); return (await c.transferOverlord(to)).wait(); }

  // ── verification loopbacks: is it live, does its ABI match, did genesis mint to overlord ──
  async function verify(address, rpcUrl, chainId) {
    var prov = rpcProvider(rpcUrl);
    var report = {};
    // 1. is-live: the address has deployed code
    var code = await prov.getCode(address);
    report.isLive = code && code !== "0x";
    // 2. genesis-mint: overlord balance == total supply (the canary invariant)
    try {
      var c = at(address, rpcUrl);
      var ov = await c.overlord();
      var bal = await c.balanceOf(ov);
      var sup = await c.totalSupply();
      report.genesisMint = bal.toString() === sup.toString();
    } catch (e) { report.genesisMint = false; }
    // 3. abi-matches: fetch the verified ABI from the explorer and compare the function set
    report.abiMatches = await abiMatches(address, chainId);
    return report;
  }

  // ONE public call to the block scanner (Etherscan/Blockscout) to collect the deployed contract's
  // verified ABI. Works WITH OR WITHOUT an api key (public endpoint; the key only raises the rate
  // limit). This single call is the source of the interaction surface; the local scientific.abi is
  // the expected value the loopback compares against.
  async function fetchExplorerAbi(address, chainId, apiKey) {
    apiKey = apiKey || keyFor(chainId);                        // use the key upgrade if present; else public
    var base = explorerApi(chainId); if (!base) return null;   // resolved per-chain (etherscan-v2 | blockscout)
    var url = apiQuery(base, "module=contract&action=getabi&address=" + address + (apiKey ? "&apikey=" + apiKey : ""));
    var j = await (await fetch(url)).json();                    // <- the one public ABI call
    if (j.status !== "1") return null;
    return JSON.parse(j.result);
  }
  // Fetch the VERIFIED SOURCE CODE from the chain's scanner — the one public getsourcecode call
  // (key-optional, same policy as fetchExplorerAbi). Normalizes Etherscan-V2 (incl. the {{…}} standard-
  // JSON-input multi-file wrapper) and Blockscout into one bundle: { files:[{name,text}], compiler,
  // optimizer, evmVersion, license, contractName, verification }. Returns null if unverified/unreachable.
  async function fetchExplorerSource(address, chainId, apiKey) {
    apiKey = apiKey || keyFor(chainId);
    var base = explorerApi(chainId); if (!base) return null;
    var url = apiQuery(base, "module=contract&action=getsourcecode&address=" + address + (apiKey ? "&apikey=" + apiKey : ""));
    var j;
    try { j = await (await fetch(url)).json(); } catch (e) { return null; }
    var r = j && j.result && j.result[0]; if (!r || (j.status && j.status !== "1")) return null;
    var raw = r.SourceCode || r.source_code || "";
    if (!raw) return null;
    var files = [];
    // Etherscan multi-file: the SourceCode is a standard-JSON-input wrapped in an extra {{ … }}
    if (typeof raw === "string" && raw.charAt(0) === "{") {
      var inner = raw; if (raw.charAt(1) === "{") inner = raw.slice(1, -1);   // strip the doubled braces
      try { var parsed = JSON.parse(inner); var src = parsed.sources || parsed; for (var k in src) files.push({ name: k.split("/").pop(), path: k, text: (src[k].content != null ? src[k].content : src[k]) }); } catch (e) { /* fall through to single */ }
    }
    if (!files.length) files.push({ name: (r.ContractName || "Contract") + ".sol", path: r.ContractName || "Contract", text: raw });
    // Blockscout additional sources
    (r.additional_sources || []).forEach(function (s) { if (s && s.source_code) files.push({ name: (s.file_path || "source").split("/").pop(), path: s.file_path, text: s.source_code }); });
    return {
      files: files,
      contractName: r.ContractName || r.name || null,
      compiler: r.CompilerVersion || r.compiler_version || null,
      optimizer: (r.OptimizationUsed != null) ? { enabled: r.OptimizationUsed === "1" || r.OptimizationUsed === true, runs: Number(r.Runs || r.optimization_runs || 0) } : null,
      evmVersion: r.EVMVersion || r.evm_version || null,
      license: r.LicenseType || r.license_type || null,
      verification: "scanner",
    };
  }
  // ── Etherscan API surface to ENHANCE DEPLOY (from github.com/etherscan/awesome-etherscan + docs.etherscan.io).
  //    Etherscan-V2 is one key, chainid in the base URL. The reads (creation, gas) are public; the
  //    verification POST needs a key → route it through the OVERLORD-gated proxy. See docs/ETHERSCAN_API.md.

  // getcontractcreation — the deploy tx + creator for an address (enriches the receipt). Public.
  async function getContractCreation(address, chainId, apiKey) {
    apiKey = apiKey || keyFor(chainId); var base = explorerApi(chainId); if (!base) return null;
    var url = apiQuery(base, "module=contract&action=getcontractcreation&contractaddresses=" + address + (apiKey ? "&apikey=" + apiKey : ""));
    try { var j = await (await fetch(url)).json(); if (j.status === "1" && j.result && j.result[0]) return { creator: j.result[0].contractCreator, txHash: j.result[0].txHash }; } catch (e) {} return null;
  }
  // gastracker gasoracle — gas price at deploy time (Safe/Propose/Fast gwei). Public.
  async function gasOracle(chainId, apiKey) {
    apiKey = apiKey || keyFor(chainId); var base = explorerApi(chainId); if (!base) return null;
    var url = apiQuery(base, "module=gastracker&action=gasoracle" + (apiKey ? "&apikey=" + apiKey : ""));
    try { var j = await (await fetch(url)).json(); if (j.status === "1" && j.result) return { safe: j.result.SafeGasPrice, propose: j.result.ProposeGasPrice, fast: j.result.FastGasPrice }; } catch (e) {} return null;
  }

  // SPDX license → Etherscan licenseType code (verifysourcecode param).
  var LICENSE_CODES = { "None": 1, "Unlicense": 2, "MIT": 3, "GNU GPLv2": 4, "GPL-2.0": 4, "GNU GPLv3": 5, "GPL-3.0": 5, "GNU LGPLv2.1": 6, "LGPL-2.1": 6, "GNU LGPLv3": 7, "LGPL-3.0": 7, "BSD-2-Clause": 8, "BSD-3-Clause": 9, "MPL-2.0": 10, "OSL-3.0": 11, "Apache-2.0": 12, "GNU AGPLv3": 13, "AGPL-3.0": 13, "BSL-1.1": 14 };
  // Build a Solidity standard-JSON-input from an in-house source bundle (deploy/sources.json entry + file texts).
  function buildStandardJson(files, optimizer, evmVersion) {
    var sources = {}; files.forEach(function (f) { sources[f.path || f.name] = { content: f.text }; });
    var settings = { optimizer: optimizer || { enabled: false, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } };
    if (evmVersion) settings.evmVersion = evmVersion;
    return JSON.stringify({ language: "Solidity", sources: sources, settings: settings });
  }
  // verifysourcecode (POST, needs key) — submit standard-JSON-input; returns a GUID. apiBase carries the key/chainid.
  async function verifySource(apiBase, params) {
    var body = new URLSearchParams(Object.assign({ module: "contract", action: "verifysourcecode", codeformat: "solidity-standard-json-input" }, params));
    try { var j = await (await fetch(apiBase, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: body.toString() })).json(); return j; } catch (e) { return { status: "0", result: String(e && e.message || e) }; }
  }
  // checkverifystatus — poll a verification GUID.
  async function checkVerifyStatus(chainId, guid, apiKey) {
    apiKey = apiKey || keyFor(chainId); var base = explorerApi(chainId); if (!base) return null;
    var url = apiQuery(base, "module=contract&action=checkverifystatus&guid=" + guid + (apiKey ? "&apikey=" + apiKey : ""));
    try { return await (await fetch(url)).json(); } catch (e) { return null; }
  }

  // Resolve the ABI to drive the UI: prefer the deployed (verified, public-fetched) ABI; fall back
  // to the bundled scientific.abi when the scanner is unreachable. Still just one ABI call.
  async function loadAbi(address, chainId, apiKey) {
    var live = await fetchExplorerAbi(address, chainId, apiKey);
    return live || ABI;
  }
  async function abiMatches(address, chainId, apiKey) {
    var on = await fetchExplorerAbi(address, chainId, apiKey); if (!on) return null;
    var want = new Set(ABI.map(function (s) { return typeof s === "string" ? s.split("(")[0].replace(/^function |^event /, "").trim() : s.name; }));
    var got = new Set(on.filter(function (x) { return x.type === "function" || x.type === "event"; }).map(function (x) { return x.name; }));
    var missing = [];
    want.forEach(function (n) { if (n && !got.has(n)) missing.push(n); });
    return { ok: missing.length === 0, missing: missing };
  }

  // ── transaction history feed (parsec-style) ──
  // explorer list of txs touching the contract; falls back to scanning Transfer logs over RPC.
  async function txHistory(address, chainId, opts) {
    opts = opts || {};
    opts.apiKey = opts.apiKey || keyFor(chainId);
    var base = explorerApi(chainId);
    if (base) {
      var url = apiQuery(base, "module=account&action=txlist&address=" + address +
        "&startblock=0&endblock=99999999&sort=desc&page=1&offset=" + (opts.limit || 25) +
        (opts.apiKey ? "&apikey=" + opts.apiKey : ""));
      try {
        var r = await fetch(url); var j = await r.json();
        if (j.status === "1") return j.result.map(function (t) {
          return { hash: t.hash, from: t.from, to: t.to, value: t.value, ts: Number(t.timeStamp),
                   ok: t.isError === "0", method: t.functionName || t.input.slice(0, 10), explorer: explorerTx(chainId, t.hash) };
        });
      } catch (e) { /* fall through to RPC */ }
    }
    return await transferLogs(address, opts.rpcUrl, opts.fromBlock || 0);
  }
  async function transferLogs(address, rpcUrl, fromBlock) {
    var c = at(address, rpcUrl);
    var evs = await c.queryFilter(c.filters.Transfer(), fromBlock);
    return evs.reverse().map(function (e) {
      return { hash: e.transactionHash, from: e.args[0], to: e.args[1], value: e.args[2].toString(),
               block: e.blockNumber, method: "Transfer" };
    });
  }
  function explorerTx(chainId, hash) {
    var e = explorerOf(chainId);
    return e ? (e.tx || (e.explorer + "/tx/")) + hash : "";
  }

  // The contract-creation transaction — the GENESIS of the feedback loop. The tx-history feed
  // anchors here and polls forward from the deploy block (every refresh re-reads from chain/scanner).
  async function deployTx(address, chainId, apiKey) {
    apiKey = apiKey || keyFor(chainId);
    var base = explorerApi(chainId); if (!base) return null;
    try {
      var url = apiQuery(base, "module=contract&action=getcontractcreation&contractaddresses=" + address + (apiKey ? "&apikey=" + apiKey : ""));
      var j = await (await fetch(url)).json();
      if (j.status === "1" && j.result && j.result[0]) {
        var r = j.result[0];
        return { hash: r.txHash, from: r.contractCreator, to: address, kind: "deploy", method: "⟐ deploy",
                 block: Number(r.blockNumber || 0), ok: true, explorer: explorerTx(chainId, r.txHash) };
      }
    } catch (e) { /* scanner may not support getcontractcreation */ }
    return null;
  }

  // ── deploy (single-contract handoff): arm (encode) → launch (broadcast) ──
  async function deploy(bytecode, overlord) {
    var p = walletProvider(); var s = await p.getSigner();
    var f = new (E()).ContractFactory(ABI, bytecode, s);
    var c = await f.deploy(overlord);
    await c.waitForDeployment();
    return await c.getAddress();
  }

  global.Scientific = {
    ABI: ABI,
    at: at, snapshot: snapshot, balanceOf: balanceOf, allowance: allowance,
    transfer: transfer, approve: approve, transferFrom: transferFrom, transferOverlord: transferOverlord,
    verify: verify, abiMatches: abiMatches, fetchExplorerAbi: fetchExplorerAbi, fetchExplorerSource: fetchExplorerSource, loadAbi: loadAbi,
    getContractCreation: getContractCreation, gasOracle: gasOracle, verifySource: verifySource, checkVerifyStatus: checkVerifyStatus, buildStandardJson: buildStandardJson, LICENSE_CODES: LICENSE_CODES,
    txHistory: txHistory, deployTx: deployTx, explorerTx: explorerTx, explorerOf: explorerOf, keyFor: keyFor, deploy: deploy
  };
  if (typeof module !== "undefined" && module.exports) module.exports = global.Scientific;
})(typeof window !== "undefined" ? window : globalThis);
