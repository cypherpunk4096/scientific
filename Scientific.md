# `Scientific` — the SCIEN·TIFIC first-light mint (review)

> The OVERLORD's **first deploy** and the SCIENTIFIC deploy-template instance shipped by
> `pages/deployer.html`. A **self-contained, zero-import** ERC-20 whose fixed supply is the largest
> value the EVM can represent — `2²⁵⁶-1` — minted in full to the `bankon.eth` OVERLORD at genesis.
> Its ERC-20 metadata **splits the word**: `name() = "SCIEN"`, `symbol() = "TIFIC"` (the token is
> SCIEN·TIFIC; "SCIENTIFIC" is the template/concept name). It is the canary that proves the OVERLORD
> deploy→launch→register path and the same multichain-CREATE2 deployment shape the ENS registry uses.

| | |
|---|---|
| **Source** | `contracts-evm/scifi/Scientific.sol` |
| **Artifact** | `scientific/scientific.json` (+ `.abi`, `.standard-input.json` for verification) |
| **Compiler** | `solc 0.8.24` · optimizer on (200 runs) · `evm_version = cancun` |
| **License** | MIT |
| **Standard(s)** | ERC-20 (hand-rolled, minimal — no OpenZeppelin) |
| **Upgradeable** | no — immutable; no proxy, no admin over balances/supply (only an `overlord` handle) |
| **Constructor** | `constructor(address overlord_)` — `overlord_ == 0` defaults to `msg.sender` |
| **Deploy** | CREATE2 via Nick's factory (`0x4e59…956C`), chosen launch salt `deltaverse.scientific.crexx0c7` → `0x99999923fAb5D50Df0F3b2F89a49d18EC82Bea79` on every chain; optional ENS name `scientific.bankon.eth` (see §16) |
| **Tests** | genesis / transfer / allowance / overlord / fuzz-conservation (see §13) |

---

## 1. Purpose

SCIENTIFIC encodes one idea from the scifi domain: *measure for accuracy, then mint at the scientific
maximum.* The nGn oscilloscope samples sound at 18-decimal accuracy and derives a `uint256` voiceprint
in exactly this numeric domain; SCIENTIFIC's supply is the **ceiling** of that domain,
`type(uint256).max`. It is deliberately the **first** contract the OVERLORD deploys — a single-contract
"first-light canary" that exercises the client-side deploy→launch→`/live`-register flow before any
larger suite is risked. Functionally it is a correct, fixed-supply ERC-20: no mint, burn, fee, or pause.

## 2. SCIEN·TIFIC naming (important)

The token metadata deliberately splits the word across the two ERC-20 string fields:

```
name()   == "SCIEN"     (Scientific.sol:21)
symbol() == "TIFIC"     (Scientific.sol:22)
```

"SCIENTIFIC" is the **template/concept** name only ("measured from SCIENTIFIC"); the Solidity contract
is `Scientific`; the **token** is SCIEN·TIFIC. Revert strings are prefixed `TIFIC:` accordingly. These
are `string public constant` values baked into bytecode — verified on-chain via `cast call name()`
returning `"SCIEN"`.

## 3. Design notes

- **Zero imports** — airgap/offline-compileable; the whole ERC-20 surface is hand-rolled so the canary
  is auditable in one screen and free of external dependencies. Not OpenZeppelin-based.
- **Fixed supply at genesis** — there is **no `mint()`**; `TOTAL_SUPPLY = type(uint256).max` is reached
  at construction and can never grow. The supply is the "scientific maximum."
- **`overlord` ≠ custody** — the privileged actor cannot mint, burn, freeze, or move others' tokens;
  its only power is reassigning its own recognition handle (cypherpunk2048 deploy-then-devolve posture).
- **Multichain CREATE2** — fixed salt + fixed ctor `overlord` ⇒ identical address on every chain; the
  same shape `DvEnsSubnameRegistry` uses (see [`../ens-multichain/DvEnsSubnameRegistry.md`](../ens-multichain/DvEnsSubnameRegistry.md)).

## 4. Roles & access control

One privileged actor, **`overlord`** (the `bankon.eth` OVERLORD). It is **not** an admin over balances
or supply — it cannot mint, burn, freeze, or move other holders' tokens. Its only privileged action is
`transferOverlord` (reassign the recognition handle, e.g. devolution to the DAIO). All ERC-20
operations are permissionless.

## 5. Storage / state

| Slot | Declaration (`:line`) | Meaning |
|---|---|---|
| const | `name="SCIEN"`, `symbol="TIFIC"`, `decimals=18` (`:21-23`) | metadata (word split across name+symbol) |
| const | `TOTAL_SUPPLY = type(uint256).max` (`:26`) | the scientific maximum, `2²⁵⁶-1` |
| `totalSupply` | `uint256` (`:28`) | set once to `TOTAL_SUPPLY`; never changes |
| `overlord` | `address` (`:29`) | recognition handle; settable only via `transferOverlord` |
| `balanceOf` | `mapping(address⇒uint256)` (`:31`) | balances; seeded entirely to `overlord` |
| `allowance` | `mapping(owner⇒mapping(spender⇒uint256))` (`:32`) | ERC-20 allowances |

## 6. Constructor / initializer

`constructor(address overlord_)` (`:38-43`) — if `overlord_ == address(0)` defaults to `msg.sender`;
sets `overlord`, `totalSupply = TOTAL_SUPPLY`, credits the **entire** supply to `overlord`, and emits
`Transfer(address(0), overlord, TOTAL_SUPPLY)` — the canonical genesis-mint log. The ctor arg is part of
the CREATE2 initcode, so the **same `overlord` must be used on every chain** to keep the address
identical (the deployer fixes this).

## 7. Functions

| Function | R/W | Access | Effect | Reverts |
|---|---|---|---|---|
| `transfer(to,value)→bool` (`:45`) | write | any holder | move `value` to `to` | `"TIFIC:zero to"`, `"TIFIC:balance"` |
| `approve(spender,value)→bool` (`:49`) | write | any | set allowance | — |
| `transferFrom(from,to,value)→bool` (`:55`) | write | approved spender | spend allowance + move | `"TIFIC:allowance"`, `"TIFIC:zero to"`, `"TIFIC:balance"` |
| `transferOverlord(to)` (`:73`) | write | `overlord` | reassign the handle | `"TIFIC:only overlord"` |
| `name`/`symbol`/`decimals`/`totalSupply`/`overlord`/`balanceOf`/`allowance` | read | any | public getters | — |

## 8. Code walkthrough

- **`constructor` (`:38-43`).** Zero-address fallback to `msg.sender`; sets `totalSupply` and
  `balanceOf[overlord]` to `TOTAL_SUPPLY` (mints the *entire* supply at genesis); `Transfer(0x0, …)` is
  the canonical mint log. No `mint()` exists → supply is permanently fixed.
- **`transfer` (`:45-47`).** Delegates to `_transfer(msg.sender, …)`.
- **`approve` (`:49-53`).** Standard overwrite-and-emit. The classic approve-race applies (set to zero
  first with untrusted spenders).
- **`transferFrom` (`:55-60`).** Requires `allowance >= value`, and **only decrements when the allowance
  is not `type(uint256).max`** — infinite approval is treated as unlimited.
- **`_transfer` (`:62-70`).** Guards `to != 0` and sufficient balance, then moves inside `unchecked`.
  Safe by a **supply-conservation invariant**: total supply is exactly `2²⁵⁶-1` and conserved, so the
  credit can't overflow (no balance can exceed the max) and the debit can't underflow (checked by the
  `require`). The comment at `:66` states this.
- **`transferOverlord` (`:73-77`).** `require(msg.sender == overlord)`, emits `OverlordTransferred`
  before reassigning — touches **no balances**, for clean devolution to a DAIO.

## 9. Events / Errors

Events: `Transfer(from,to,value)` (incl. the genesis mint), `Approval(owner,spender,value)`,
`OverlordTransferred(from,to)` (`:34-36`). Errors are revert strings: `"TIFIC:zero to"`,
`"TIFIC:balance"`, `"TIFIC:allowance"`, `"TIFIC:only overlord"`.

## 10. Security notes & invariants

- **Fixed supply** — no mint/burn; `totalSupply == 2²⁵⁶-1` for all time; conserved by `_transfer`.
- **`unchecked` is sound** under supply conservation (not a latent overflow): the only way a balance
  could overflow is if total supply exceeded `2²⁵⁶-1`, which is impossible.
- **`overlord` ≠ custody** — cannot seize/mint/freeze; only its own handle is mutable.
- **Approve race** applies (`approve` overwrites) — standard ERC-20 caveat.
- **Not a liquidity token** — a market can never circulate `2²⁵⁶-1` meaningfully; SCIENTIFIC is a
  *concept/accounting* unit + canary, not a tradable-supply token. Reviewers should read it as such.

## 11. Deploy order & dependencies

Stage **E1**, `firstLight` of the stack — depends on nothing on-chain except Nick's CREATE2 factory
(`0x4e59…956C`, present on all public chains; the deployer deploys it on a fresh anvil). CREATE2
(`salt = deltaverse.scientific.v1`) → identical address per chain; optional ENS name
`scientific.bankon.eth`. Armed by DEPLOY, fired by the OVERLORD's signed LAUNCH, registered to `/live`.

## 12. Integration

- **`pages/deployer.html`** — the OVERLORD-gated, gate-first single-contract deployer: toggle chains →
  DEPLOY (arm, predicts the CREATE2 address) → LAUNCH (add-or-switch · gas preflight · idempotent
  skip-if-live, per chain) → verify + interact via the bundled/imported ABI. Same multichain shape as
  `ensdeployer.html`.
- **`scientific/` engine** — the chain-aware template (verify loopbacks, one public key-optional ABI
  call, deploy-anchored tx feedback "measured from SCIENTIFIC").
- Shares the 18-decimal `uint256` domain with the nGn oscilloscope voiceprint. Sibling unit: `BKPY`
  (BANKON PYTHAI repunit).

## 13. Usage

```js
const sci = new ethers.Contract(addr, abi, signer);
await sci.name();                        // "SCIEN"
await sci.symbol();                      // "TIFIC"
await sci.totalSupply();                 // 2n**256n - 1n
await sci.balanceOf(OVERLORD);           // == totalSupply at genesis
await sci.transfer(recipient, 1_000n);
await sci.transferOverlord(daioAddress); // hand the recognition handle to the DAIO
```

## 14. Tests

Genesis (`balanceOf(overlord) == totalSupply == 2²⁵⁶-1`, exactly one mint `Transfer`); transfer +
`"TIFIC:balance"`/`"TIFIC:zero to"` reverts; `transferFrom` finite vs infinite (`type(uint256).max`)
allowance; `transferOverlord` gate + balances unchanged; fuzz preserves `Σ balances == 2²⁵⁶-1`.
End-to-end on anvil: CREATE2 deploy returns the deterministic address with `name()="SCIEN"`,
`symbol()="TIFIC"`, and the genesis-mint loopback passing.

## 15. Extension notes

The canonical **fixed-supply, overlord-minted, zero-import ERC-20** shape. New value tokens copy it and
change only `name`/`symbol`/`TOTAL_SUPPLY` (exactly what `BKPY` does); keep `transferOverlord` for
uniform devolution; keep `unchecked` only while the supply-conservation invariant holds (a token with a
`mint()` or a non-max supply must drop the `unchecked` or re-add overflow checks).

## Treasury surface — receive & send funds

The contract is also the OVERLORD's treasury: it **receives** funds and dispenses them **only by the
OVERLORD's hand**. Token balances and supply are never touched by any of it.

| function | gate | what it does |
|---|---|---|
| `receive()` | none (payable) | plain ETH transfers land in the contract; emits `Received(from, value)` |
| `sendValue(address to, uint256 value)` | OVERLORD | sends ETH held by the contract via `call`; emits `Sent(to, value)` |
| `sendToken(address token, address to, uint256 value)` | OVERLORD | sends any ERC-20 the contract holds (including SCIEN·TIFIC itself — rescues stuck tokens); raw-selector call keeps the zero-import stance and tolerates no-return (USDT-shape) tokens; emits `TokenSent(token, to, value)` |

Trading note: the ERC-20 surface is exact-standard (bool returns, no transfer fees, no hooks,
infinite-allowance short-circuit), so DEXes trade it normally once liquidity is added. Uniswap-V2-style
pools cap reserves at `uint112` (~5.2·10³³ wei ≈ 5.2·10¹⁵ tokens per pool) — a bound per pool, not a
blocker; V3/V4-style pools bound positions at `uint128`.

## 16. Live deployments & verification (mainnet record)

> The full URL & address registry for **all** live DeltaVerse contracts (token + naming layer, every
> explorer link) is [`docs/LIVE-CONTRACTS.md`](../../docs/LIVE-CONTRACTS.md).

**The total mint** — `TOTAL_SUPPLY = type(uint256).max = 2²⁵⁶−1`, minted in full to the OVERLORD at
genesis, with `decimals() = 18`:

```
raw (wei-units): 115792089237316195423570985008687907853269984665640564039457584007913129639935
formatted:       115,792,089,237,316,195,423,570,985,008,687,907,853,269,984,665,640,564,039,457.584007913129639935 SCIEN·TIFIC
```

**One address, every chain** (CREATE2, salt `deltaverse.scientific.crexx0c7`, ctor overlord =
`bankon.eth 0x10f7Ee226B16bea7f365Dc1eDEF159Fc1957D169`):

```
0x99999923fAb5D50Df0F3b2F89a49d18EC82Bea79
```

These addresses/URLs are the reference for **contract verification** on each explorer
(canonical machine record: [`live/tokens/scientific-multichain.json`](../../live/tokens/scientific-multichain.json)):

| chain | token page | deploy tx | block · time (UTC) |
|---|---|---|---|
| Ethereum (1) | [etherscan.io/token/0x99999923…bea79](https://etherscan.io/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79) | [`0x6506b53f…7814b7`](https://etherscan.io/tx/0x6506b53ff3fca11a36da089e014d74bdca492cfefe7b2472516baa54987814b7) | 25587014 · 2026-07-22 08:15:23 |
| Optimism (10) | [optimistic.etherscan.io/token/0x99999923…bea79](https://optimistic.etherscan.io/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79) | [`0x71c2c243…679e64`](https://optimistic.etherscan.io/tx/0x71c2c243e85f821082a0be105335660db594d89ece8b85c2d4110801a9679e64) | 154554719 · 2026-07-22 08:16:55 |
| Base (8453) | [basescan.org/token/0x99999923…bea79](https://basescan.org/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79) | [`0x69c61b14…f6643e`](https://basescan.org/tx/0x69c61b149f5e85cb0583c1b7473f3e8f4c4b8d436799ce911677b5f223f6643e) | 48963798 · 2026-07-22 10:42:23 |
| Arbitrum One (42161) | [arbiscan.io/token/0x99999923…bea79](https://arbiscan.io/token/0x99999923fab5d50df0f3b2f89a49d18ec82bea79) | [`0xee7108f0…9f8e35`](https://arbiscan.io/tx/0xee7108f0ed2494af03a37f9539415b67797263dd2f2ef7ce2b4f78e39f9f8e35) | 486503608 · 2026-07-22 10:43:33 |

Verify with: `solc 0.8.24+commit.e11b9ed9`, optimizer on (200 runs), `evm_version = cancun`,
standard-input at `scientific/scientific.standard-input.json`, constructor argument
`000000000000000000000000 10f7ee226b16bea7f365dc1edef159fc1957d169` (ABI-encoded `bankon.eth`).
Deployer-of-record on every chain is Nick's factory `0x4e59b44847b379578588920cA78FbF26c0B4956C`
(the tx sender is the OVERLORD; the CREATE2 `msg.sender` is the factory).

**Why Arbitrum took 5 signatures where the other chains took 1** — the Arbitrum LAUNCH ran with the
**ENS naming toggle ON**, which fires the full naming ladder after the token deploy; the other chains
launched naming-off (a single CREATE2 call). All five succeeded:

| # | what | tx |
|---|---|---|
| 1 | SCIEN·TIFIC token CREATE2 deploy | [`0xee7108f0…9f8e35`](https://arbiscan.io/tx/0xee7108f0ed2494af03a37f9539415b67797263dd2f2ef7ce2b4f78e39f9f8e35) |
| 2 | `DvEnsSubnameRegistry` CREATE2 deploy (one-time per chain, reused by every later name) | [`0x3dc0b53e…d0b252`](https://arbiscan.io/tx/0x3dc0b53eae74fdd00b76555088ca615360aa9446aefcdc53021c13dcd0d0b252) |
| 3 | `claimRoot(bankon.eth)` (one-time per chain) | [`0x86bf9ddc…f59e65`](https://arbiscan.io/tx/0x86bf9ddc7389d773e8958ec426bec62b61a8e1aec57891e98ce3df42eff59e65) |
| 4 | mint subname `scientific.bankon.eth` | [`0x05ba6110…3a5dc7`](https://arbiscan.io/tx/0x05ba611033e846c6d2fa3ea5151fca54d6e933ee65a2bf8651dc7663b93a5dc7) |
| 5 | `setAddr` → point the name at the token | [`0x847bc350…599022`](https://arbiscan.io/tx/0x847bc350e9cc419c41e5098e9ef63de640311a527c46ea8c90deedcb40599022) |

Arbitrum's registry lives at `0xe03883147602cbe3c2c28f9a41d179fafda9fea3`; running NAME (ens only) on
the other live chains later deploys the same registry address there and takes the same 4 naming steps —
steps 2–3 are one-time per chain, so later names on a named chain cost only steps 4–5.
