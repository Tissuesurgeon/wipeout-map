import type { Hex } from "viem";
import type { SomniaNative } from "../native/client.js";
import type { Executor } from "./types.js";
/** What the session-key executor is built from. */
export interface SessionKeyExecutorDeps {
    chainId: number;
    /** The `/native` client over the owning engine's socket — only the session send is used. */
    native: Pick<SomniaNative, "sendSessionTransaction">;
    /** 32-byte session seed — the credential; the node derives the account from it. */
    seed: Hex;
    defaultGas: bigint;
}
/**
 *  True when `executor` came from {@link createSessionKeyExecutor}, so it sends
 *  its seed to the node. The smart-account spec and `accountFor` refuse it as
 *  `inner`.
 *
 * @internal
 */
export declare function isSessionKeyExecutor(executor: Executor): boolean;
/**
 *  Build the session-key executor. Internal: `client.createExecutor({ sessionSeed })`
 *  hands one out.
 *
 * @internal
 */
export declare function createSessionKeyExecutor(deps: SessionKeyExecutorDeps): Executor;
