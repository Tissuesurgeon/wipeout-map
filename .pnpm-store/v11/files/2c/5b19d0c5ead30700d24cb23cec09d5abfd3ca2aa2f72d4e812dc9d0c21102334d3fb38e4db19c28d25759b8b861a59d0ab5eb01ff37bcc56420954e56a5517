# Addresses and chains

Where every address comes from, which chains are covered, and what happens on one that is not.

## The rule

**No address is ever a constant in this package, and none should be one in yours.**
`src/generated/deployments.ts` is written on every build from the committed deploy manifests under
`smart-contracts/deployments`, so an address in your code is a second source of truth the moment it
exists.

## Coverage

| Chain          | Id      | Environment      | Salt version |
| -------------- | ------- | ---------------- | ------------ |
| Somnia mainnet | `5031`  | `somnia-mainnet` | `v1`         |
| Somnia testnet | `50312` | `somnia-testnet` | `v1`         |
| Hideki testnet | `50383` | `hideki-testnet` | `v1`         |

**The factory is at the same address on all three**, and so is every other contract in the set. That
is CREATE3: the address depends on the deployer and the salt, not on the chain or the bytecode.

```ts
import {SUPPORTED_CHAIN_IDS} from "@somnia-chain/accounts-sdk";

SUPPORTED_CHAIN_IDS; // readonly number[], ascending
```

`SUPPORTED_CHAIN_IDS` is derived from the manifests, not typed out — so a new deployment appears here
without anyone editing a list.

**A chain absent from that table has no accounts.** If your application supports more chains than
this — Somnia Elwood (`50313`) and a local fork (`31337`) are the common cases — decide what that
means before a user reaches it. See _What an unsupported chain does_ below.

## Contract names

`DeployedName` is a union of exactly what the manifests spell, so a typo is a compile error:

| Name                                             | What it is                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `SomniaAccountFactory`                           | the factory proxy — the address to call                                          |
| `SomniaAccountFactoryImpl`, `…ImplV2`, `…ImplV3` | implementations behind it                                                        |
| `Safe`                                           | the singleton accounts are proxies of                                            |
| `CompatibilityFallbackHandler`                   | what answers `isValidSignature` for an account                                   |
| `MultiSend`                                      | batcher that permits a nested `delegatecall` — **not what this SDK uses**        |
| `MultiSendCallOnly`                              | batcher that does not. This is the one                                           |
| `safeSingleton`, `fallbackHandler`               | the factory's _configuration_, echoing `Safe` and `CompatibilityFallbackHandler` |
| `factoryAdmin`                                   | an EOA: who can upgrade the factory                                              |
| `protocolDeployer`                               | the pre-existing CREATE3 registry the rest derive from                           |

The last three are not contracts this repo deploys. They are published because looking one of them
up is exactly what an operator needs to do, and the alternative is a hardcoded constant elsewhere.

## Looking one up

```ts
import {
  contractAddress,
  deploymentFor,
  deploymentsFor,
  factoryAddress,
} from "@somnia-chain/accounts-sdk";

contractAddress(chainId, "MultiSendCallOnly"); // one address
factoryAddress(chainId); // the factory, named because it is the one you want most
deploymentFor(chainId); // the whole set for a chain
deploymentsFor(chainId); // every committed set, when a chain has more than one salt version
```

## What an unsupported chain does

It **throws**, and that is deliberate:

- `UnsupportedChainError` — nothing is committed for that chain id.
- `MissingContractError` — the chain is covered but that manifest has no entry for that name.
- `AmbiguousDeploymentError` — more than one salt version is committed and you did not say which.
  Pass `saltVersion`.

None of them returns `undefined`, because `undefined` at the point an address goes into a
transaction becomes the zero address — a call to nowhere that succeeds, costs gas, and does nothing.

```ts
import {
  SUPPORTED_CHAIN_IDS,
  UnsupportedChainError,
  factoryAddress,
} from "@somnia-chain/accounts-sdk";

// Ask first, in a UI that spans more chains than the factory does.
if (!SUPPORTED_CHAIN_IDS.includes(chainId)) {
  // render "no accounts on this network" rather than a disabled button with no explanation
}

// Or catch, in a code path that should not have got here.
try {
  factoryAddress(chainId);
} catch (e) {
  if (e instanceof UnsupportedChainError) console.warn(`no factory on ${e.chainId}`);
  else throw e;
}
```

## Salt versions

A chain can have more than one committed deployment — a `v2` salt produces a different factory
address and therefore a different set of accounts. Every address function takes an optional
`saltVersion` for that reason, and omitting it on a chain with several is
`AmbiguousDeploymentError` rather than a silent pick.

All three chains are on `v1` today, so the argument can be left off everywhere.

## The client's chain is checked

`readAccountAddress` compares the client's chain against the one you asked about and throws
`WrongNetworkError` (with `expected` and `actual`) rather than reading the wrong factory. A client
pinned to mainnet answering questions about testnet is otherwise indistinguishable from a correct
answer.

## Related

- [Account derivation](./account-derivation.md) — how an address is computed from a key
- [Errors](./errors.md)
- `docs/contracts.md` in the repository — every address per chain, and the standing admin risk
