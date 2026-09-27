# User guide

## Getting started

Open the Doubt web app. You do not need an account or wallet.

### Discovery feed (home)

Three tabs:

| Tab | Meaning |
|-----|---------|
| **Radar** | Tokens ranked by combined exit quality and activity |
| **Fresh** | Newest pools first — thin books often mean expensive exits |
| **Fading** | Poor exit math and/or sharp recent dumps |

Each **card** shows:

- Symbol, name, price  
- Score and verdict (SAFE / CAUTION / RISKY / AVOID)  
- Exit impact for a **$500** notional  
- Liquidity, age, 1h volume and price change  
- Estimated rug probability  

Tap a card for the full **Verdict**.

### Check any CA

Paste a Solana mint in the search bar → **Check**.  
Invalid addresses are rejected before a request is made.

### Verdict page

The verdict is the product core:

1. **Verdict badge** — overall label  
2. **Rug probability** — inverse of combined score (heuristic, not a prediction market)  
3. **Exit math** — approximate exit value after buys of $100 / $500 / $5,000  
4. **Cascade scenario** — rough impact if large holders exit into the book  
5. **Reasons** — human-readable flags (e.g. micro liquidity, unlocked LP)  
6. **Share** — copy or system share of a short summary  

Footer always reminds: **Not financial advice. Discovery only.**

### How to read scores

| Verdict | Interpretation |
|---------|----------------|
| SAFE | Exit conditions look relatively favorable vs peers |
| CAUTION | Tradeable but fragile — size carefully |
| RISKY | High exit cost or thin structure |
| AVOID | Structure suggests severe exit pain |

Scores are **relative heuristics**, not guarantees. Low data confidence → treat as riskier than the label alone.

### What Doubt does not do

- Buy or sell tokens  
- Recommend position size  
- Promise safety or returns  
