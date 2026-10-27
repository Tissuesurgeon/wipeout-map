// The account an exchange trades as, across every chain it spans: ONE address
// (the cross-chain safe factory deploys the same address on every chain) and
// one executor per chain. Reads need only the address; a write on a market
// goes through the executor of that market's chain.
//
// Pure types + a guard. Executors are built with `client.createExecutor(...)`
// on the engine of the chain they send on.
/** True when a signer config value is a {@link SomniaMarketsAccount} rather than a viem account or address. */
export function isSomniaMarketsAccount(value) {
    return (typeof value === "object" &&
        value !== null &&
        "executors" in value &&
        typeof value.executors === "object" &&
        typeof value.address === "string");
}
