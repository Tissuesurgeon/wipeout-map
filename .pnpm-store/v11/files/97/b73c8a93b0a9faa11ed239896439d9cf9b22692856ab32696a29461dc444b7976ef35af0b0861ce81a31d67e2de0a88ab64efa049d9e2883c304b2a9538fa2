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
/** What a revert means, and whether it is worth retrying. */
export type SafeError = {
    readonly code: string;
    /** One sentence, for a person. */
    readonly message: string;
    /**
     *  `true` when the same bytes might succeed later, `false` when they never will.
     *
     *  Load-bearing rather than informational: this is the flag a submit path reads to decide
     *  whether to re-sign, and getting it wrong in the `true` direction produces an infinite loop
     *  of wallet prompts.
     */
    readonly retryable: boolean;
    /**
     *  Set when one code covers several distinct causes.
     *
     *  Present means "do not show `message` as the diagnosis" — it is a summary, and the readings
     *  are the actual possibilities. A UI that has ruled some out should say the rest.
     */
    readonly readings?: readonly {
        cause: string;
        retryable: boolean;
    }[];
};
/** Every code this module knows, for a test that checks nothing was dropped. */
export declare const KNOWN_SAFE_ERRORS: readonly string[];
/**
 *  Pull a Safe revert code out of anything a node or a library hands back.
 *
 *  Word-bounded, and that matters: an unanchored `GS02` matches inside `GS026`, and a substring
 *  search for `GS026` matches the string `NOTGS0261` in a longer message. viem's errors nest the
 *  reason several layers down and repeat it, so this looks at the whole text rather than trying to
 *  find the one true field.
 */
export declare function safeErrorCode(error: unknown): string | undefined;
/** What a Safe revert means, or `undefined` when it is not one. */
export declare function explainSafeError(error: unknown): SafeError | undefined;
/**
 *  Whether re-signing the same intent could succeed.
 *
 *  For an ambiguous code, this is `true` when **any** reading is retryable — deliberately
 *  optimistic, because the caller is expected to have ruled out what it can. A submit path that
 *  cannot tell "not an owner" from "stale nonce" should check ownership itself before retrying,
 *  which is exactly the guard the dex branch was missing.
 */
export declare function isRetryable(error: unknown): boolean;
//# sourceMappingURL=safe-errors.d.ts.map