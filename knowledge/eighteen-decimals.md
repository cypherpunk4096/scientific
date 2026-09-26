# Eighteen decimals — and why a 16 in the code is not a precision

**Claim.** Every quantity in this estate is carried at **18 decimals** (ERC-20 `decimals() = 18`,
wei parity: 1 LUV = 10¹⁸ luvwei, 1 ETH = 10¹⁸ wei, SCIEN·TIFIC `decimals = 18`). Rounding is
display-only and labelled.

## The 16 you will see, and what it is

JSON-RPC encodes every number as a hexadecimal string (`"0x18d9d4a"`). Code that reads it parses
in **base 16**:

```python
int(b["number"], 16)          # Python: radix 16
```
```js
parseInt(b.number, 16)        // JS: radix 16
"0x" + n.toString(16)         // JS: back to hex for the next call
```

That `16` is the **radix of hexadecimal**, fixed by the Ethereum JSON-RPC spec. It has nothing to do
with decimal places. Changing it to 18 would misread every block number and balance.

## Where 16 digits *would* be a mistake

A float64 (JavaScript `Number`, Python `float`) keeps about **15–17 significant digits**. A token
balance has up to 78 digits. Pushing wei through a float silently keeps ~16 digits and drops the
rest — for example the seed ETH `51922968585348276` wei printed through a float reads
`0.05192296858534827` (17 decimals, last digit lost), while the exact value is
`0.051922968585348276`.

The rule:

| do | don't |
|---|---|
| keep wei as integers (`int`, `BigInt`) | `Number(wei) / 1e18` or `float(wei) / 1e18` |
| format by integer division: `f"{v // 10**18}.{v % 10**18:018d}"` | `toFixed(16)`, `round(x, 16)` |
| derive ratios at 18dp with floor division (`(a * 10**18) // b`) | float division, then rounding |
| label anything shortened for display | present a rounded number as the value |

Reference implementations: [chronos.oracle](https://github.com/cypherpunk2048/chronos.oracle)
(`blocktime`, `luvprice`, `lockertime`, `financialtime` — Python and JS twins that agree to the last
digit).

---

<sub>made with [LUV ❤](https://luv.pythai.net/) · measured by SCIEN·TIFIC</sub>
