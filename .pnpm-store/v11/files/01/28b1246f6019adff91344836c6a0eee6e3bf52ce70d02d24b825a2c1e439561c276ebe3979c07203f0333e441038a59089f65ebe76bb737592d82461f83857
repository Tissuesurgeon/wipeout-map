import { createNonceManager, jsonRpc } from "viem/nonce";
/** A per-(chainId, address) promise tail. A failed task releases the key. */
function makeSendLane() {
    const tails = new Map();
    return ({ address, chainId }, task) => {
        const key = `${chainId}:${address.toLowerCase()}`;
        const previous = tails.get(key) ?? Promise.resolve();
        const result = previous.then(task);
        const tail = result.then(() => undefined, () => undefined);
        tails.set(key, tail);
        void tail.then(() => {
            if (tails.get(key) === tail)
                tails.delete(key);
        });
        return result;
    };
}
/** Build the writer state owned by one configured Markets client. */
export function makeWriterRuntime() {
    const nonceManager = createNonceManager({ source: jsonRpc() });
    return { nonceManager, runLocalSend: makeSendLane(), runSmartAccountSend: makeSendLane() };
}
