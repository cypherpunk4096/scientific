# scientific/ — the SCIENTIFIC deploy template (single-contract handoff)

SCIENTIFIC began as **`scientific.sol`** and was the **first deploy** — the one that automated the
build and **organizes every other deploy after it**. This folder is the canonical **template** for a
single-contract handoff: deploy one contract, verify it on-chain, and operate **every input field**
from a live UI with verification loopbacks and parsec-style transaction history. Clone this family for
any new contract (`<name>.sol` → `<name>.abi` → `<name>.{xml,js,ts,tsx,css,tcss}`).

## The `.sol` is the root of the family

`scientific.sol` is the **source of truth**. Everything else derives from it:

```
scientific.sol  ──(solc 0.8.24, optimizer 200, cancun)──▶  scientific.json { abi, bytecode }
       │                                                          │
       │                                                          └──▶  scientific.abi   (interaction surface)
       └──▶  scientific.standard-input.json  (the Standard-JSON-Input — REQUIRED to VERIFY the contract on Etherscan / `forge verify-contract`)
```

- **The `.sol` creates the ABI** — the ABI is the compiler output of the source; it is not authored by hand.
- **The `.sol` is required for verification** — Etherscan / block-explorer source verification needs
  the exact source (via `scientific.standard-input.json`). Without the `.sol`, the deployed bytecode
  cannot be verified, and the `abi-matches` loopback cannot be trusted.

## The family

| File | Role |
|---|---|
| **`scientific.sol`** | **the source** — compiles to the ABI + bytecode; the verification source. |
| `scientific.standard-input.json` | Solidity Standard-JSON-Input — the exact payload to verify on Etherscan / `forge verify-contract`. |
| `scientific.abi` | the ABI (compile output of `.sol`) used to interact with every input field. The UI re-fetches it from the explorer and **loops back to verify** it matches this file. |
| `scientific.xml` | the deploy/interaction manifest: source → abi → deployments → UI lanes → verification loopbacks; CREATE2/ENS multichain. |
| `scientific.js` | prototype lane — UMD `window.Scientific` (live reads, signed writes, verify loopbacks, tx history, deploy). |
| `scientific.ts` | production lane — strict-TS twin (the value-moving path). |
| `scientific.tsx` | production UI — React `ScientificPanel`: live snapshot, verification badges, ABI-driven form (every read/write field), parsec-style tx feed. |
| `scientific.css` | web styling. |
| `scientific.tcss` | terminal twin (Textual CSS). |

## Deploy → verify → operate (what the template automates)

1. **Build** — `solc`/`forge` compiles `scientific.sol` → `scientific.json` (abi + bytecode) + `scientific.standard-input.json`.
2. **Deploy** — the OVERLORD deploys the single contract (`ctor(overlord)`); CREATE2 + `scientific.bankon.eth`. Address recorded to `/live` and into `scientific.xml`.
3. **Verify** — submit `scientific.standard-input.json` to the explorer (`forge verify-contract`). The `abi-matches` loopback confirms the on-chain verified ABI equals `scientific.abi`.
4. **Operate** — `scientific.tsx`/`.js`/`.ts` drive every input field live, with the loopbacks
   (`is-live` via `eth_getCode`, `abi-matches`, `genesis-mint` = `balanceOf(overlord) == totalSupply`)
   and the transaction-history feed.

## Why it's the template that organizes all deploys

SCIENTIFIC is the first-light canary (suite `settlement-tokens`, stage **E1**, `firstLight`): the
single contract whose deploy proved the whole **build → deploy → verify → register → operate**
automation. Every other suite/contract in `deploy/suites.json` + `~/PYTHAI` follows this same family
shape, anchored on its own `.sol`. The contract source is `contracts-evm/scifi/Scientific.sol`
(== `scientific.sol` here); its holding is `~/PYTHAI/evm/settlement-tokens/Scientific/`. Standard:
ERC-20 (`docs/standards/README.md`).
