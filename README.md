<div align="center">

# SCIEN·TIFIC

**Measure for accuracy, then mint at the scientific maximum.**

A self-contained, zero-import ERC-20 whose fixed supply is the largest value the EVM can
represent — `2²⁵⁶ − 1` — minted in full to the `bankon.eth` OVERLORD at genesis. The unit of
scientific accounting for the DeltaVerse.

**Built to the [cypherpunk4096 standard](https://github.com/cypherpunk4096/standard)** (2¹²) —
determinism · zero dependencies · green-checkmark verification · precision · quantum compliance.

[![License: MIT](https://img.shields.io/badge/License-MIT-e3b25f?style=for-the-badge)](LICENSE)
[![Solidity 0.8.24](https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity&logoColor=white)](Scientific.sol)
[![EVM: cancun](https://img.shields.io/badge/EVM-cancun-627EEA?style=for-the-badge&logo=ethereum&logoColor=white)](foundry.toml)
[![Standard: cypherpunk4096](https://img.shields.io/badge/standard-cypherpunk4096-000000?style=for-the-badge)](https://github.com/cypherpunk4096/standard)
[![Zero imports](https://img.shields.io/badge/dependencies-zero-2ea44f?style=for-the-badge)](Scientific.sol)

**One address, every chain**
`0x99999923fAb5D50Df0F3b2F89a49d18EC82Bea79`

[![Ethereum](https://img.shields.io/badge/Ethereum-deployed-627EEA?logo=ethereum&logoColor=white)](https://etherscan.io/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79)
[![Optimism](https://img.shields.io/badge/Optimism-deployed-FF0420?logo=optimism&logoColor=white)](https://optimistic.etherscan.io/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79)
[![Base](https://img.shields.io/badge/Base-deployed-0052FF?logo=coinbase&logoColor=white)](https://basescan.org/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79)
[![Arbitrum](https://img.shields.io/badge/Arbitrum-deployed-2D374B?logo=arbitrum&logoColor=white)](https://arbiscan.io/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79)

</div>

---

## The token that spells its own name

SCIEN·TIFIC splits the word across the two ERC-20 string fields — a signature, not a quirk:

```solidity
name()   == "SCIEN"     // Scientific.sol
symbol() == "TIFIC"     // the token is SCIEN·TIFIC
```

`"SCIENTIFIC"` is the concept; the Solidity contract is `Scientific`; the token is **SCIEN·TIFIC**.
Revert strings carry the `TIFIC:` prefix. All three values are `string public constant`, baked into
bytecode and verifiable on-chain with a single `cast call name()`.

## Live deployment

Deterministic across every chain — CREATE2 via Nick's factory
(`0x4e59b44847b379578588920cA78FbF26c0B4956C`), salt `deltaverse.scientific.crexx0c7`, constructor
overlord = `bankon.eth 0x10f7Ee226B16bea7f365Dc1eDEF159Fc1957D169`. Same initcode ⇒ **same address
everywhere**:

> ### `0x99999923fAb5D50Df0F3b2F89a49d18EC82Bea79`

| Chain | Token | Deploy tx | Block · time (UTC) |
|---|---|---|---|
| Ethereum (1) | [`0x99999923…Bea79`](https://etherscan.io/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79) | [`0x6506b53f…7814b7`](https://etherscan.io/tx/0x6506b53ff3fca11a36da089e014d74bdca492cfefe7b2472516baa54987814b7) | 25587014 · 2026-07-22 08:15 |
| Optimism (10) | [`0x99999923…Bea79`](https://optimistic.etherscan.io/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79) | [`0x71c2c243…679e64`](https://optimistic.etherscan.io/tx/0x71c2c243e85f821082a0be105335660db594d89ece8b85c2d4110801a9679e64) | 154554719 · 2026-07-22 08:16 |
| Base (8453) | [`0x99999923…Bea79`](https://basescan.org/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79) | [`0x69c61b14…f6643e`](https://basescan.org/tx/0x69c61b149f5e85cb0583c1b7473f3e8f4c4b8d436799ce911677b5f223f6643e) | 48963798 · 2026-07-22 10:42 |
| Arbitrum One (42161) | [`0x99999923…Bea79`](https://arbiscan.io/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79) | [`0xee7108f0…9f8e35`](https://arbiscan.io/tx/0xee7108f0ed2494af03a37f9539415b67797263dd2f2ef7ce2b4f78e39f9f8e35) | 486503608 · 2026-07-22 10:43 |

The full genesis mint — `TOTAL_SUPPLY = 2²⁵⁶ − 1`, decimals 18:

```
115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457.584007913129639935 SCIEN·TIFIC
```

## Design, in one screen

- **Zero imports.** The entire ERC-20 surface is hand-rolled — airgap- and offline-compileable,
  auditable in a single screen, free of any supply chain. Not OpenZeppelin-based.
- **Fixed supply at genesis.** There is no `mint()`. `TOTAL_SUPPLY = type(uint256).max` is credited in
  full to the overlord at construction and can never grow. The `unchecked` transfer path is sound by a
  supply-conservation invariant: no balance can exceed a total that is already the ceiling.
- **`overlord` ≠ custody.** The one privileged actor cannot mint, burn, freeze, or move another
  holder's tokens. Its only power is `transferOverlord` — reassigning its own recognition handle, for
  clean devolution to a DAIO. Every ERC-20 operation is permissionless.
- **Treasury surface.** The contract receives ETH (`receive()`) and any ERC-20, and dispenses them
  **only by the overlord's hand** (`sendValue` / `sendToken`, raw-selector, USDT-shape tolerant) —
  token balances and supply are never touched by it.

Read the full line-by-line review in **[`Scientific.md`](Scientific.md)**.

## Accuracy for DeFi — chronos.oracle × kairos.oracle

SCIEN·TIFIC lives in an **18-decimal `uint256` accuracy domain** — the same domain the nGn
oscilloscope samples sound into, and the same domain DeFi settles value in. Accuracy is the whole
thesis: *measure before you mint.* For DeFi, an accurate unit needs two ground truths, and the
DeltaVerse supplies both as first-class oracles:

| Oracle | Answers | Ground truth |
|---|---|---|
| **chronos.oracle** | **when** — time as a service | blocktime, normalized by average blocktime, attested on-chain (never wall-clock) |
| **kairos.oracle** | **how much** — price as a service | AMM pair reserves read directly from chain — the pool *is* the price; aggregators are enrichment, never the source |

Together they close the accuracy loop: **kairos** measures the price the market actually prints from
liquidity reserves, **chronos** timestamps it in blocktime, and SCIEN·TIFIC denominates the result at
full 18-decimal, wei-parity precision. A DeFi integration that reads price from an aggregator and time
from the wall clock is guessing; reading kairos and chronos is measuring. SCIEN·TIFIC is the unit that
measurement mints into.

chronos.oracle also carries a **Moore's-law measure**, supplied by **kronos.agent**: historical time
indexed not only in blocks and seconds but in the doubling of storage. We deploy at the threshold of the
*age of the terabyte* — as of 2026 the Bitcoin blockchain has not yet crossed its first terabyte and is
climbing toward it, its growth tracking Moore's law — so the protocol can read "where we are" as a
timestamp against the doubling, not only against the wall.

## The standard — cypherpunk4096

SCIEN·TIFIC was built to **cypherpunk2048** (2¹¹): write code, sovereignty over custody, consent over
default, power-of-two discipline, verification over trust. It now advances to **cypherpunk4096** (2¹²) —
the newly formed successor tier that doubles the bar:

- **Determinism as identity** — one CREATE2 address on every chain; the initcode *is* the name.
- **Zero dependencies** — a unit meant to outlast frameworks inherits no supply chain.
- **Verification over trust** — every claim here resolves to a green checkmark on a public explorer
  (see the table above), reproducible by anyone with the standard-input JSON in this repo.
- **Precision without approximation** — 18-decimal accuracy carried at full width; rounding is a
  display decision, never a storage one.

It stands on **[cypherpunk2048](https://github.com/cypherpunk2048)** (2¹¹) and is a strict superset —
read the full standard, including the **non-compatibility statement** and the **list of software that is
not accepted** (proxies, admin backdoors, CDN dependencies, closed-source bytecode, `(v,r,s)`-only
signatures, non-deterministic deploys), at **[github.com/cypherpunk4096/standard](https://github.com/cypherpunk4096/standard)**.
cypherpunk4096 also requires **quantum compliance** (signatures as `bytes`, scheme-migratable) — SCIEN·TIFIC
carries no signature surface (the `overlord` gate is a plain `msg.sender` check), so it satisfies that
commitment by construction.

Production deployments are published to **[github.com/cypherpunk4096](https://github.com/cypherpunk4096)**
as they go live. This repository is one of them.

## Build · test · verify

```sh
forge build                 # solc 0.8.24 · optimizer 200 · evm_version cancun
forge test                  # genesis / transfer / allowance / overlord / fuzz-conservation
```

Verify on any explorer with `solc 0.8.24+commit.e11b9ed9`, optimizer on (200 runs),
`evm_version = cancun`, the standard-input at [`scientific.standard-input.json`](scientific.standard-input.json),
and constructor argument `000000000000000000000000` + `10f7Ee226B16bea7f365Dc1eDEF159Fc1957D169`
(ABI-encoded `bankon.eth`). The deployer of record on every chain is Nick's factory; the transaction
sender is the OVERLORD.

## Repository layout

```
Scientific.sol                  the contract — zero imports, one screen
Scientific.md                   full line-by-line review + the mainnet record
foundry.toml                    solc 0.8.24 · optimizer 200 · cancun
scientific.abi                  the ABI
scientific.standard-input.json  standard-JSON for explorer verification
app/                            the chain-aware interact/verify console (self-contained, no CDN)
  index.html · scientific.js · scientific.css · apikeys.js · keys.example.json · README.md
```

An API key is **optional** everywhere — every read works on the public endpoint; a key only lifts the
rate limit. Never commit `keys.json` (it is gitignored); copy `app/keys.example.json` or use env vars.

## Acknowledgments

With thanks to **Bitcoin-Core** and **coinpunk** — for setting the original standard. cypherpunk4096
is a descendant, not an origin; the doctrine of *verify, don't trust* and *not your keys not your crypto* continuing the "code is law"
defi movement with SCIEN TIFIC scifi accuracy. As we move forward — **exceeding** that standard — we do so on
these shoulders:

- **[Bitcoin-Core](https://github.com/bitcoin/bitcoin)** — the reference implementation and the
  longest-running proof that a ledger can be verified, not trusted. The chain it maintains is the
  clock behind the *age of the terabyte*, and its discipline — audit the source, run your own node,
  don't trust, verify — is the discipline this repository carries into a green checkmark.
- **[coinpunk](https://github.com/coinpunk/coinpunk)** — for the self-hosted, own-your-keys ethos:
  software you run yourself, keys no one else holds. The cypherpunk line from a wallet you host to a
  unit you can verify runs straight through it.

## License

MIT © 2026 BANKON / PYTHAI. Take it, own it, use it, share it.
