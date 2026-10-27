import { NotConfiguredError } from "./errors.js";
import * as ActionsAbi from "./actionsAbi.js";
import type { Writer as WriterCtx } from "./writer.js";
import type { FaucetParams, ResolveParams, VoidMarketParams, TxResult } from "./trade.js";

export async function resolve(w: WriterCtx, p: ResolveParams): Promise<TxResult> {
  const fakeOracle = p.fakeOracle ?? w.addresses().fakeOracle;
  if (!fakeOracle) throw new NotConfiguredError("w.addresses.fakeOracle", "resolve()");
  return w.execute({
    address: fakeOracle,
    abi: ActionsAbi.fakeOracleAbi,
    functionName: "resolve",
    args: [p.market, p.outcomeIdx],
    gas: p.gas ?? w.defaultGas,
  });
}

export async function voidMarket(w: WriterCtx, p: VoidMarketParams): Promise<TxResult> {
  const fakeOracle = p.fakeOracle ?? w.addresses().fakeOracle;
  if (!fakeOracle) throw new NotConfiguredError("w.addresses.fakeOracle", "voidMarket()");
  return w.execute({
    address: fakeOracle,
    abi: ActionsAbi.fakeOracleAbi,
    functionName: "voidMarket",
    args: [p.market],
    gas: p.gas ?? w.defaultGas,
  });
}

export async function faucet(w: WriterCtx, p: FaucetParams = {}): Promise<TxResult> {
  const a = w.addresses();
  const testUsdc = p.testUsdc ?? a.collateral ?? a.testUsdc;
  if (!testUsdc) throw new NotConfiguredError("w.addresses.collateral (or testUsdc)", "faucet()");
  const amount = p.amount ?? 10_000n * w.oneBase;
  return w.execute({
    address: testUsdc,
    abi: ActionsAbi.testUsdcAbi,
    functionName: "faucet",
    args: [amount],
    gas: p.gas ?? w.defaultGas,
  });
}
