import { SomniaMarketsError } from "./errors.js";
/**
 *  Thrown when an invariant the code had already established turns out false.
 *
 *  **Details**
 *
 *  Seeing this in a log means the SDK's own reasoning was wrong — not that a
 *  caller did anything invalid. That distinction is why it is its own class.
 *
 *  **Gotchas**
 *
 *  It should never be caught to control flow, only reported as a bug.
 *  When an SDK mapping wraps an unexpected failure, `cause` retains the exact
 *  original value. Existing SDK errors and caller cancellation are not wrapped.
 */
export declare class InvariantError extends SomniaMarketsError {
    constructor(message: string, cause?: unknown);
}
/**
 *  Throws {@link InvariantError} — for the branch that cannot happen.
 *
 * **Details**
 *
 * - `message`: What was assumed, so a violation reads as the broken premise rather than a bare stack trace.
 * - Returns: Never returns; typed `never` so it composes with `??` and in exhaustive `switch` defaults.
 *
 * **Example** (Proving an invariant)
 *
 *  ```ts
 *  const head = rows[0] ?? unreachable("rows was checked non-empty above");
 *  ```
 */
export declare function unreachable(message?: string): never;
/**
 *  Throws the given error — an expression-position `throw`, for use with `??`.
 *
 *  **When to use**
 *
 *  Use when the absence is a *caller-facing* condition deserving a specific
 *  typed error, where {@link unreachable} would wrongly imply an internal bug.
 *
 * **Details**
 *
 * - `error`: The error to throw.
 * - Returns: Never returns; typed `never` so it composes in expression position.
 *
 * **Example** (Raising from an expression)
 *
 *  ```ts
 *  const market = index.get(symbol) ?? raise(new InvalidInputError(`unknown symbol ${symbol}`));
 *  ```
 */
export declare function raise(error: Error): never;
