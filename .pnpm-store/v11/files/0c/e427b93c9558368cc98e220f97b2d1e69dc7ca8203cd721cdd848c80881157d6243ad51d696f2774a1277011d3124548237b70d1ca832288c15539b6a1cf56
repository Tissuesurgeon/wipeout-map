// One failure code for every error the account view throws.
//
// The errors keep their classes, so `instanceof` still works. This mapping gives the
// same answer as a closed string union, which a caller can switch on exhaustively.

import {
  AccountViewError,
  IndexerError,
  IndexerUnavailableError,
  InvalidInputError,
  NotConfiguredError,
} from "../errors.js";
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
export function accountViewFailureReason(error: unknown): AccountViewFailureReason | null {
  // Subclasses first: both are IndexerErrors.
  if (error instanceof AccountViewError) return error.reason;
  if (error instanceof IndexerUnavailableError) return "indexerUnavailable";
  if (error instanceof IndexerError) return "requestFailed";
  if (error instanceof InvalidInputError) return "invalidInput";
  if (error instanceof NotConfiguredError) return "notConfigured";
  return null;
}
