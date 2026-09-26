# time.locker — the LUV LP lock, measured

**Claim.** 100 % of circulating SHAMBA LUV liquidity is locked in the ownerless, extend-only
`liquidity_locker` until **2026-11-22T21:57:23Z**, read from the locker itself.

| quantity | value |
|---|---|
| locker | `0x111111f70cb3469B5285862d7a4e7Cb53d04f502` |
| created | block 25,822,914, 2026-08-24T05:22:59Z (proved: no code at block − 1, code at block) |
| lock #0 (rehearsal) | 0.001000000000000000 LP, unlock 2026-11-22T21:21:11Z |
| lock #1 | 16,419,484.359707141173121139 LP, locked block 25,827,873 (2026-08-24T21:57:23Z), 90-day term |
| lock #0 + lock #1 | 16,419,484.360707141173121139 LP = LP supply − the 1,000 wei Uniswap burns = 100 % |
| treasury LP | 0 |

Live readings — `locker.time` (age since creation: exact blocks, chain-timestamp seconds),
`time.locker` (seconds to unlock; blocks projected and labelled), and both in **financial ticks** of
the chainmarketcap price record — come from chronos.oracle:

```sh
git clone https://github.com/cypherpunk2048/chronos.oracle && cd chronos.oracle
python3 src/lockertime.py      # or: node src/lockertime.js — identical output
```

Spec: [`time.locker`](https://github.com/cypherpunk2048/chronos.oracle/blob/main/time.locker) ·
live proof page: [luv.pythai.net/liqlock.html](https://luv.pythai.net/liqlock.html).

---

<sub>made with [LUV ❤](https://luv.pythai.net/) · measured by SCIEN·TIFIC</sub>
