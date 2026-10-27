import * as TradeAbi from "../tradeAbi.js";
import type { Prerequisite, Writer as WriterCtx } from "../writer.js";
import type { BurnSetParams, MintSetNativeParams, MintSetParams, MintSetPermit2Params, TxResult } from "../trade.js";

export async function mintSet(w: WriterCtx, p: MintSetParams): Promise<TxResult> {
  const gas = p.gas ?? w.defaultGas;
  const collateral = await w.poolCollateral(p.pool, p.collateral);
  // Collateral is pulled by the pool, so approve the POOL — in the same
  // executor call as the mint.
  const prerequisites: Prerequisite[] = [];
  if (p.autoApprove !== false) {
    const approval = await w.approvalIfNeeded(collateral, p.pool, p.amount, gas);
    if (approval) prerequisites.push(approval);
  }
  // Mint both YES and NO to the signer in one go.
  return w.execute(
    {
      address: p.pool,
      abi: TradeAbi.binaryPoolWriteAbi,
      functionName: "mintSet",
      args: [w.fromAddress, w.fromAddress, p.amount],
      gas,
    },
    prerequisites,
  );
}

export async function burnSet(w: WriterCtx, p: BurnSetParams): Promise<TxResult> {
  const gas = p.gas ?? w.defaultGas;
  // One operator grant on the singleton covers both YES + NO (every id), so
  // there is no per-token approval — the pool burns both halves under it.
  const prerequisites: Prerequisite[] = [];
  if (p.autoApprove !== false) {
    const outcomeToken = p.outcomeToken ?? (await w.poolTokens(p.pool)).outcomeToken;
    const grant = await w.operatorGrantIfNeeded(outcomeToken, p.pool, gas);
    if (grant) prerequisites.push(grant);
  }
  return w.execute(
    {
      address: p.pool,
      abi: TradeAbi.binaryPoolWriteAbi,
      functionName: "burnSet",
      args: [p.amount],
      gas,
    },
    prerequisites,
  );
}

export async function mintSetNative(w: WriterCtx, p: MintSetNativeParams): Promise<TxResult> {
  const router = w.resolveRouter(p.router);
  // Collateral IS native here: no ERC-20 approval, the value is msg.value and
  // the router wraps it to wNative before forwarding to the core.
  return w.execute({
    address: router,
    abi: TradeAbi.collateralRouterWriteAbi,
    functionName: "mintCompleteSetNative",
    args: [p.operatorId, p.venueId, p.marketId],
    gas: p.gas ?? w.defaultGas,
    value: p.amount,
  });
}

export async function mintSetPermit2(w: WriterCtx, p: MintSetPermit2Params): Promise<TxResult> {
  const router = w.resolveRouter(p.router);
  // No allowance step — Permit2 pulls the collateral under the signed permit.
  return w.execute({
    address: router,
    abi: TradeAbi.collateralRouterWriteAbi,
    functionName: "mintCompleteSetPermit2",
    args: [
      p.operatorId,
      p.venueId,
      p.marketId,
      p.amount,
      {
        permitted: { token: p.permit.permitted.token, amount: p.permit.permitted.amount },
        nonce: p.permit.nonce,
        deadline: p.permit.deadline,
      },
      p.signature,
    ],
    gas: p.gas ?? w.defaultGas,
  });
}
