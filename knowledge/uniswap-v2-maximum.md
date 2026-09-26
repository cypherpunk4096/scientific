# LUV maxed out Uniswap — the V2 reserve maximum, filled to the last wei

**Claim.** The SHAMBA LUV / WETH Uniswap V2 pair was seeded with exactly **2¹¹² − 1 wei of LUV**,
the largest reserve any Uniswap V2 pair can store. One wei more and the pair reverts with
`UniswapV2: OVERFLOW`.

SCIEN·TIFIC mints at the scientific maximum of the EVM (2²⁵⁶ − 1); LUV filled its market at the
maximum of Uniswap V2 (2¹¹² − 1). Same discipline, different ceiling: measure the limit, then
meet it exactly.

## The rule

`UniswapV2Pair` stores its reserves as `uint112` and checks every update
([`UniswapV2Pair.sol`, `_update`](https://github.com/Uniswap/v2-core/blob/master/contracts/UniswapV2Pair.sol)):

```solidity
uint112 private reserve0;
uint112 private reserve1;
require(balance0 <= uint112(-1) && balance1 <= uint112(-1), 'UniswapV2: OVERFLOW');
```

## The numbers (18 decimals, exact)

| quantity | value |
|---|---|
| the cap, 2¹¹² − 1 wei | 5,192,296,858,534,827.628530496329220095 LUV |
| LUV supply (the 18-digit repunit) | 111,111,111,111,111,111.000000000000000000 LUV |
| supply ÷ cap | ≈ 21.4 — the full supply cannot fit one V2 pair |
| LUV seeded, 2026-07-27, block 25,620,950 | 5,192,296,858,534,827.628530496329220095 LUV = the cap |
| ETH seeded | 0.051922968585348276 ETH = ⌊(2¹¹² − 1) ÷ 10¹⁷⌋ wei |
| LUV in the pair, 2026-09-26 | 1,597,428,260,395,553.551626469790170421 LUV (30.77 % of the cap) |

## How it was done — one transaction

Tx [`0x9f8e0bf6…4ff13`](https://etherscan.io/tx/0x9f8e0bf6e566e809ca78eb18730b8f4305534e755a98a78f7924794757d4ff13),
block 25,620,950, from the treasury **bankon.eth** (`0x10f7Ee226B16bea7f365Dc1eDEF159Fc1957D169`) to
the Uniswap V2 Router (`0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`):

```
addLiquidityETH(                              selector 0xf305d719
  token              = 0x2711111111683B8708cb9a48cBf36a51315F8254   (LUV)
  amountTokenDesired = 0xffffffffffffffffffffffffffff                (2¹¹² − 1: 112 one-bits)
  amountTokenMin     = 97.5 % of desired
  amountETHMin       = 97.5 % of the ETH sent
  to                 = bankon.eth
)  value = 51922968585348276 wei
```

The pair did not exist yet, so the router created it inside the same transaction. The pair's first
`Sync` event recorded `reserve0 = 5192296858534827628530496329220095` — exactly 2¹¹² − 1.

## What it means

- **At launch the pool was full**, so the first trade could only be a buy: a sell would have pushed
  the LUV reserve past the cap and reverted.
- **Buys take LUV out** of the pool, which is what raised the price; the room they leave under the
  cap now exceeds the largest single transaction the token allows (1 % of supply, ≈ 1.11 quadrillion).
- **Everything that did not fit** stays with the treasury.
- Between LUV trades the pool ratio is fixed, so LUV's dollar price moves with ETH — LUV moves at the
  speed of Ethereum.

## Reproduce

```sh
RPC=https://eth.drpc.org   # archive-capable; receipts for old blocks
# the seed's Sync event: reserve0 must equal 2^112-1
curl -s -X POST $RPC -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionReceipt","params":["0x9f8e0bf6e566e809ca78eb18730b8f4305534e755a98a78f7924794757d4ff13"]}' \
 | python3 -c "import json,sys;r=json.load(sys.stdin)['result'];[print(int(l['data'][2:66],16)==2**112-1) for l in r['logs'] if l['topics'][0]=='0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1']"
# today's reserves: getReserves() on the pair
curl -s -X POST https://ethereum-rpc.publicnode.com -A curl/8 -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0x57D2085Aa859a145cB107845AD03c0eAAFBD8a31","data":"0x0902f1ac"},"latest"]}'
```

Published for participants at [luv.pythai.net/faq.html#maxed](https://luv.pythai.net/faq.html#maxed).

---

<sub>made with [LUV ❤](https://luv.pythai.net/) · measured by SCIEN·TIFIC</sub>
