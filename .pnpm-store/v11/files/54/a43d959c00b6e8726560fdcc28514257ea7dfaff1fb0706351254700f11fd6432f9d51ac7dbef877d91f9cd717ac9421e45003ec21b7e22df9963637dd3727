import type { AccountViewFailureReason } from "./types.js";
/**
 *  The failure code of an error an account-view read threw.
 *
 *  **Details**
 *
 *  - `error`: What the read threw.
 *  - Returns: The {@link AccountViewFailureReason}, or `null` for an error the account
 *    view does not report, such as the caller's own abort reason. A caller's abort is
 *    not a failure.
 *
 * **Example** (Showing why an account could not be read)
 *
 *  ```ts
 *  import { accountViewFailureReason } from "@somnia-chain/markets-sdk";
 *
 *  try {
 *    await client.accountOrders.getSnapshot(account);
 *  } catch (e) {
 *    const reason = accountViewFailureReason(e);
 *    if (reason === null) throw e;
 *    console.error("account unavailable:", reason);
 *  }
 *  ```
 *
 * @category account views
 */
export declare function accountViewFailureReason(error: unknown): AccountViewFailureReason | null;
