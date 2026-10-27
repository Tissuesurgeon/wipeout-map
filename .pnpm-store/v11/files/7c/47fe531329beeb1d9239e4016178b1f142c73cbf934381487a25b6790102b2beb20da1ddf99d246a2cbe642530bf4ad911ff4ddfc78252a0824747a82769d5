/**
 *  Safe's revert codes, as sentences.
 *
 *  `GS026` is why this file exists. It is returned for **three different situations** that want
 *  three different responses from a UI, and conflating two of them has already cost us a bug on
 *  the dex branch: a retry loop treated "signer is not an owner" as a stale nonce and re-signed
 *  forever. The codes below are therefore not a lookup table with one string each — the ambiguous
 *  ones carry every reading, and the caller has to say which it can rule out.
 *
 *  Every string here is written for the person who clicked the button, not for us. `GS026` tells a
 *  trader nothing; "the key that signed is not an owner of this account" tells them what to do.
 *
 *  **Tracks Safe 1.5.0**, which is the version our factory deploys and what a live account reports
 *  for `VERSION()`. That matters for one absence: `GS013` — "the inner transaction reverted" — is
 *  a 1.3/1.4 code and does not exist in 1.5.0, so it is deliberately not here. The mechanism it
 *  described is still real (a failed inner call reverts the whole `execTransaction`), which is why
 *  it is easy to keep quoting from memory; the code just is not what a 1.5.0 account emits. The
 *  test beside this file reads Safe's own source and fails if this table and the contracts ever
 *  disagree, so the next version bump cannot slip past.
 */
const ERRORS = {
    GS000: { code: "GS000", message: "The account could not be set up.", retryable: false },
    GS001: { code: "GS001", message: "This account has already been set up.", retryable: false },
    GS002: {
        code: "GS002",
        message: "The address the account was told to call has no contract at it.",
        retryable: false,
    },
    GS010: { code: "GS010", message: "The transaction data was the wrong length.", retryable: false },
    GS011: {
        code: "GS011",
        message: "Gas was not enough for the account to even try.",
        retryable: true,
    },
    GS012: {
        code: "GS012",
        message: "The account could not pay the gas refund it was asked for.",
        retryable: false,
    },
    GS020: { code: "GS020", message: "Signatures were missing entirely.", retryable: false },
    GS021: { code: "GS021", message: "A signature was malformed.", retryable: false },
    GS022: {
        code: "GS022",
        message: "A contract signature pointed outside the data given.",
        retryable: false,
    },
    GS023: { code: "GS023", message: "A contract owner rejected the signature.", retryable: false },
    GS024: {
        code: "GS024",
        message: "A contract owner's signature was not accepted.",
        retryable: false,
    },
    GS025: {
        code: "GS025",
        message: "An owner approved a different transaction than this one.",
        retryable: false,
    },
    GS026: {
        code: "GS026",
        message: "The signature was not accepted for this transaction.",
        retryable: false,
        // The whole reason this module is not a Record<string, string>. Safe emits one code for
        // three situations, and the correct response differs in kind: one is "try again", one is
        // "you cannot do this", one is "sign again over fresh data".
        readings: [
            {
                cause: "The key that signed is not an owner of this account. Signing again will fail the same way.",
                retryable: false,
            },
            {
                cause: "The nonce was already used — something else executed from this account first. Re-signing over the new nonce will work.",
                retryable: true,
            },
            {
                cause: "The signature was over different data than what was submitted.",
                retryable: false,
            },
        ],
    },
    GS030: {
        code: "GS030",
        message: "Only the account itself may make this change.",
        retryable: false,
    },
    GS031: {
        code: "GS031",
        message: "The account must be set up before this is allowed.",
        retryable: false,
    },
    GS100: { code: "GS100", message: "That module address cannot be used.", retryable: false },
    GS101: { code: "GS101", message: "That module is already enabled.", retryable: false },
    GS102: { code: "GS102", message: "The module list entry given does not match.", retryable: false },
    GS103: { code: "GS103", message: "A module must be enabled to do this.", retryable: false },
    GS104: { code: "GS104", message: "Only an enabled module may do this.", retryable: false },
    GS105: { code: "GS105", message: "The module list page requested was invalid.", retryable: false },
    GS106: { code: "GS106", message: "A module list page cannot be zero-sized.", retryable: false },
    GS200: {
        code: "GS200",
        message: "Owners cannot be changed and a payment made in the same transaction.",
        retryable: false,
    },
    GS201: { code: "GS201", message: "The threshold cannot be zero.", retryable: false },
    GS202: { code: "GS202", message: "That owner address cannot be used.", retryable: false },
    GS203: { code: "GS203", message: "That address is already an owner.", retryable: false },
    GS204: {
        code: "GS204",
        message: "That address is not an owner of this account.",
        retryable: false,
    },
    GS205: {
        code: "GS205",
        message: "The owner list position given does not match the account's current list. The list changed since it was read.",
        // Re-reading the owner list gives the right position, so the *action* is fine; only this
        // attempt's inputs were stale.
        retryable: true,
    },
    GS300: {
        code: "GS300",
        message: "The threshold cannot be higher than the number of owners.",
        retryable: false,
    },
    GS301: { code: "GS301", message: "An account needs at least one owner.", retryable: false },
    GS400: {
        code: "GS400",
        message: "An account cannot be its own fallback handler.",
        retryable: false,
    },
};
/** Every code this module knows, for a test that checks nothing was dropped. */
export const KNOWN_SAFE_ERRORS = Object.keys(ERRORS);
/**
 *  Pull a Safe revert code out of anything a node or a library hands back.
 *
 *  Word-bounded, and that matters: an unanchored `GS02` matches inside `GS026`, and a substring
 *  search for `GS026` matches the string `NOTGS0261` in a longer message. viem's errors nest the
 *  reason several layers down and repeat it, so this looks at the whole text rather than trying to
 *  find the one true field.
 */
export function safeErrorCode(error) {
    const text = error instanceof Error ? `${error.message}` : String(error ?? "");
    const match = /\bGS(\d{3})\b/i.exec(text);
    if (match === null)
        return undefined;
    return `GS${match[1]}`;
}
/** What a Safe revert means, or `undefined` when it is not one. */
export function explainSafeError(error) {
    const code = safeErrorCode(error);
    if (code === undefined)
        return undefined;
    return (ERRORS[code] ?? {
        // A code we do not have a sentence for is still worth naming as a Safe revert rather than
        // passing the raw viem wall through. `retryable: false` is the safe default: a retry loop
        // on an unknown code is the failure mode that costs real money in wallet prompts.
        code,
        message: `The account rejected the transaction (${code}).`,
        retryable: false,
    });
}
/**
 *  Whether re-signing the same intent could succeed.
 *
 *  For an ambiguous code, this is `true` when **any** reading is retryable — deliberately
 *  optimistic, because the caller is expected to have ruled out what it can. A submit path that
 *  cannot tell "not an owner" from "stale nonce" should check ownership itself before retrying,
 *  which is exactly the guard the dex branch was missing.
 */
export function isRetryable(error) {
    const explained = explainSafeError(error);
    if (explained === undefined)
        return false;
    if (explained.readings !== undefined) {
        return explained.readings.some((r) => r.retryable);
    }
    return explained.retryable;
}
//# sourceMappingURL=safe-errors.js.map