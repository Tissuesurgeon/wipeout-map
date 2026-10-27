import { createWalletClient, custom, type Address, type WalletClient } from "viem";
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains";

type Ethereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

declare global {
  interface Window {
    ethereum?: Ethereum;
  }
}

const CHAIN_HEX = "0xc4cf";

export async function connectWallet(): Promise<{ address: `0x${string}`; client: WalletClient; exchange: SomniaMarkets }> {
  const ethereum = window.ethereum;
  if (!ethereum) throw new Error("No injected wallet. Install MetaMask.");
  await ethereum.request({ method: "eth_requestAccounts" });
  try {
    await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
  } catch {
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: CHAIN_HEX,
        chainName: hidekiTestnet.name,
        nativeCurrency: hidekiTestnet.nativeCurrency,
        rpcUrls: [...hidekiTestnet.rpcUrls.default.http],
      }],
    });
  }
  const client = createWalletClient({ chain: hidekiTestnet, transport: custom(ethereum) });
  const [address] = await client.getAddresses();
  if (!address) throw new Error("Wallet returned no account");
  if (hidekiTestnet.id !== 50383) throw new Error("SDK chain is not Hideki");
  const exchange = new SomniaMarkets({
    chain: hidekiTestnet,
    addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
    indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql",
    walletClient: client,
  });
  return { address, client, exchange };
}

const approveAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export async function approveToken(token: Address, spender: Address, amount: bigint): Promise<`0x${string}`> {
  const ethereum = window.ethereum;
  if (!ethereum) throw new Error("No injected wallet");
  const client = createWalletClient({ chain: hidekiTestnet, transport: custom(ethereum) });
  const [address] = await client.getAddresses();
  if (!address) throw new Error("Wallet returned no account");
  return client.writeContract({
    account: address,
    address: token,
    abi: approveAbi,
    functionName: "approve",
    args: [spender, amount],
    chain: hidekiTestnet,
  });
}
