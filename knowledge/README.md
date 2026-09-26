# SCIEN·TIFIC knowledge base

**Measure for accuracy.** Each entry is a claim that was measured, not asserted: the value at full
precision (18 decimals where the quantity has them), the on-chain source it was read from, and the
command that reproduces the reading. An entry that cannot be reproduced from the chain or from
public source code does not belong here.

| entry | the claim, in one line |
|---|---|
| [uniswap-v2-maximum.md](uniswap-v2-maximum.md) | LUV maxed out Uniswap: its pair was seeded with exactly 2¹¹²−1 wei of LUV, the largest reserve a V2 pair can store |
| [eighteen-decimals.md](eighteen-decimals.md) | 18 decimals is the unit of precision; a `16` in RPC code is the hex radix, never a decimal count |
| [time-locker.md](time-locker.md) | the LUV LP lock measured in blocks, seconds and financial ticks, by chronos.oracle |

## Method

1. **Read it from the chain** at a stated block (JSON-RPC `eth_call`, `eth_getBlockByNumber`,
   `eth_getTransactionReceipt`); historic state needs an archive node.
2. **Keep integers integers.** Token amounts are uint256 wei; format them by integer division by
   10¹⁸, never through a float (a float64 keeps ~16 significant digits and silently drops the rest).
3. **Label what is derived.** Ratios and rates are derived at 18dp with floor division; timestamps
   carry their source resolution (1 s on chain, 1 µs in a database).
4. **Link the source.** Every entry names the transaction, the contract read, and the code that
   defines the rule.

The standard behind the method: [cypherpunk4096](https://github.com/cypherpunk4096/standard) —
verification over trust; precision without approximation.

---

<sub>made with [LUV ❤](https://luv.pythai.net/) · measured by SCIEN·TIFIC</sub>
