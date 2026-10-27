import type { Address } from "viem";
import { type NonceManager } from "viem/nonce";
/** The identity whose local sends must reach terminal broadcast results in order. */
export interface LocalSendKey {
    readonly address: Address;
    readonly chainId: number;
}
/** Runs `task` after every earlier task for the same key has settled. */
export type SendLane = <T>(key: LocalSendKey, task: () => Promise<T>) => Promise<T>;
/** Owner-held nonce and send coordination shared by every derived trader. */
export interface WriterRuntime {
    readonly nonceManager: NonceManager;
    readonly runLocalSend: SendLane;
    /**
     *  One signed smart-account execute at a time per account. The account's
     *  Safe nonce is read at plan time, so plan, signature and send must settle
     *  before the next plan reads it. The account task runs the inner send
     *  inside it, so this lane is separate from `runLocalSend`: an account at
     *  its sender's own address (an EIP-7702 account) must not wait on itself.
     */
    readonly runSmartAccountSend: SendLane;
}
/** Build the writer state owned by one configured Markets client. */
export declare function makeWriterRuntime(): WriterRuntime;
