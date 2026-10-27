/**
 * Minimal fragments copied from `@somnia-chain/markets-sdk` `dist/readsAbi.d.ts`.
 * The package export map does not expose that module, so these tuples are inlined
 * for Multicall3. Names and types match the SDK ABI.
 */
export const marginBankHealthAbi = [
  {
    type: "function",
    name: "getAccountHealth",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "equity", type: "int256" },
      { name: "imReq", type: "uint256" },
      { name: "mmReq", type: "uint256" },
      { name: "cmReq", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getPosition",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "perpPool", type: "address" },
    ],
    outputs: [
      {
        name: "position",
        type: "tuple",
        components: [
          { name: "size", type: "int128" },
          { name: "avgEntryPrice", type: "uint128" },
          { name: "entryFundingIndex", type: "int256" },
          { name: "lastUpdatedTimestampNs", type: "uint64" },
        ],
      },
    ],
  },
] as const;

export const erc20ProbeAbi = [
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
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;
