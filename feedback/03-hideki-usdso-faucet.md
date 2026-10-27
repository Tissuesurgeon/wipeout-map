# Hideki has no paper USDso faucet in the SDK guide

## What happened

`docs/how-to/get-testnet-funds.md` tells you to mint USDso at a Shannon address (`0x9c32…b171` on chain 50312). Hideki is chain 50383 and was regenesised on 17 Sep 2026. That mint does not apply here. `hidekiTestnet.blockExplorers` is unset, so there is no explorer link to attach to a hash.

## Expected

A Hideki USDso credit or mint, and an explorer base URL, documented next to the Hideki RPC.

## Repro

Read the SDK doc above and `dist/chains/definitions/hidekiTestnet.d.ts`. The live check is in `docs/VERIFY.md` under the faucet section.

## What we did

`scripts/verify/place-samples.ts` does not invent a mint. It sends nothing unless a gitignored `TEST_PRIVATE_KEY` is present, and even then it refuses to broadcast until a Hideki mint is confirmed. The server never reads the key.
