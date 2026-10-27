# How to get testnet funds

This guide shows you how to fund an account on the Shannon testnet for the three things trading needs: gas, spot and perp collateral, and binary collateral. It assumes you have a private key and know its address.

## Gas: STT

Every transaction pays gas in STT. A write also needs the account to hold the SDK's gas ceiling times its fee ceiling on top of the transaction value: 0.6 STT at the defaults (see [Configuration](../reference/configuration.md#gas)). The chain refunds unused gas.

Request STT from one of the faucets listed on the Somnia network page: the official faucet at `https://testnet.somnia.network/`, the Google Cloud faucet for Somnia Shannon, or the Stakely and Thirdweb faucets. Each faucet pays a fixed amount per request; repeat until the balance covers what you need. Some faucets require the requesting address to hold funds on another network first. If none works, ask in the `#dev-chat` channel of the Somnia Discord.

Check the balance with a configured exchange:

```ts
const balances = await exchange.fetchBalance();
console.log(balances.STT?.total);
```

`fetchBalance` needs a signer in the configuration. Without one, read `exchange.client.getNativeBalance(address)` instead; it returns wei as a `bigint`.

## Spot and perp collateral: USDso

`USDso` is the quote token of the spot pairs and the settlement token of the perps. On Shannon it has a public `mint(address, uint256)` with 18 decimals. Mint it with viem:

```ts
import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(privateKey);
const wallet = createWalletClient({ account, chain: exchange.client.config.chain, transport: http() });

const hash = await wallet.writeContract({
  address: "0x9c32f3827a1a99f0cf9b213de8b53ec3d57bb171", // USDso on Shannon
  abi: [
    {
      type: "function",
      name: "mint",
      stateMutability: "nonpayable",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [],
    },
  ],
  functionName: "mint",
  args: [account.address, parseUnits("1000", 18)],
  gas: 500_000n,
});
await exchange.client.getViemClient().waitForTransactionReceipt({ hash });
```

The SDK does not wrap this call. USDso is a test token; the mainnet collateral has no mint.

To sell SOMI on `SOMI/USDso`, no USDso is needed: the base of that pair is the native token, and a sell escrows STT.

## Binary collateral: tUSDC

The binary markets on Shannon settle in `tUSDC`, a 6-decimal test token with a faucet. The SDK wraps it:

```ts
await exchange.trader.faucet(); // mints 10,000 tUSDC to the signer
```

`faucet()` needs `addresses.collateral` (present in `SOMNIA_TESTNET_ADDRESSES`) and a signer. Pass `{ amount }` in raw units to mint less. The contract caps the amount per call; a larger request reverts with `FaucetCapExceeded`.

## Verify

```ts
console.log(await exchange.fetchBalance());
```

The result keys balances by currency code: `STT`, `USDso`, `tUSDC`, and one key per binary tradable you hold shares of, for example `BTC-0-04SEP26/tUSDC#YES`.

## Perps

Perp orders draw margin from the MarginBank, not from the wallet. After minting USDso, deposit it:

```ts
await exchange.depositMargin("BTC/USDso:USDso", 100);
```

See [Perps](../PERPS.md) for margin, leverage, and funding.
