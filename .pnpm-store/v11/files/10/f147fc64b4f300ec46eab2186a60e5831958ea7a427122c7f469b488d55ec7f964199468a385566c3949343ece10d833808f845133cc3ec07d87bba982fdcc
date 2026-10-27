// `raise` / `unreachable` — the concrete form of CONVENTIONS.md's "prove it
// instead" rule for values that are typed nullable but known present.
//
// A non-null assertion (`x!`) tells the COMPILER to stop worrying and leaves
// nothing behind at runtime: if the invariant is ever wrong, the value flows on
// as undefined and fails somewhere else, as something else. These throw instead —
// same brevity at the call site, but the invariant is documented and self-checking.
//
//     const last = items.at(-1) ?? unreachable("items was just bounds-checked");
//
// Reach for a real guard (or a typed error from errors.ts) when the value is
// genuinely caller-influenced — `unreachable` is for what the surrounding code
// has already established.
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
export class InvariantError extends SomniaMarketsError {
    constructor(message, cause) {
        super(`invariant violated: ${message}`, cause === undefined ? undefined : { cause });
        this.name = "InvariantError";
    }
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
export function unreachable(message = "expected a value to be present") {
    throw new InvariantError(message);
}
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
export function raise(error) {
    throw error;
}
