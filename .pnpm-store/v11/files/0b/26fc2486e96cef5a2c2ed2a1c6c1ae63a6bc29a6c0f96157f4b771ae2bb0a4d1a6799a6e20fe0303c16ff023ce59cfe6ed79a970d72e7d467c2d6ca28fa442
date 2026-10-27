// The executor seam: who signs and sends a write, separated from what the
// write is. The writer encodes calls; an executor turns them into a receipt.
//
// This is what makes a safe, a session key, a wallet and a private key
// interchangeable actors. The SDK ships four executors (local signer, wallet
// client, session key, safe) and accepts any object that implements the
// interface, so an app that already sends through its own account layer
// hands the SDK the receipt it holds instead of the SDK fetching it again.
//
// Pure types — the built-in executors live beside this file, one per kind.
export {};
