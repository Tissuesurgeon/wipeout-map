// Every listener of an account, and a `getSnapshot` caller, gets the same view objects.
// A listener that changed one would change it for all of them, so a view is frozen all
// the way down.
/**
 *  Freezes `value` and every object and array it holds, and returns it. An error is left
 *  as it is: it belongs to the code that threw it, and error tools add fields to it.
 */
export function deepFreeze(value) {
    if (typeof value !== "object" || value === null || value instanceof Error)
        return value;
    for (const key of Reflect.ownKeys(value)) {
        const child = Reflect.get(value, key);
        deepFreeze(child);
    }
    Object.freeze(value);
    return value;
}
