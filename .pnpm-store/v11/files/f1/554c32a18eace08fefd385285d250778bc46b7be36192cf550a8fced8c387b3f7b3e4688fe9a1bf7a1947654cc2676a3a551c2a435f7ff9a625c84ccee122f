import { keccak256, stringToHex } from "viem";
import { IndexerError, InvalidInputError } from "./errors.js";
import * as IndexerRead from "./indexerRead.js";
import type { FillsPageOptions, FillsScope, GetUserFillsPageOptions } from "./fills.js";
import type { MarketType } from "./markets.js";

type Position = { timestamp: string; blockNumber: string; logIndex: number };

/** A canonical unsigned decimal string: no sign, no leading zero, no exponent. */
export const isDecimal = (value: unknown): value is string =>
  typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value);

/** A log index the indexer can serve: a non-negative int32. */
export const isLogIndex = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2_147_483_647;

const normalizeFilter = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.length) throw new InvalidInputError("Fill scope must be non-empty strings");
  return value.toLowerCase();
};

export const prepare = ({
  account,
  options,
  chainId,
  source,
}: {
  account: string;
  options: GetUserFillsPageOptions;
  chainId: number;
  source: string;
}) => {
  if (typeof account !== "string" || !account.length) throw new InvalidInputError("Fill account is required");
  const limit = options.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
    throw new InvalidInputError("Fill page limit must be an integer from 1 to 1000");
  }
  for (const time of [options.since, options.until]) {
    if (time !== undefined && (!Number.isSafeInteger(time) || time < 0)) {
      throw new InvalidInputError("Fill time bounds must be non-negative safe integer seconds");
    }
  }
  if (options.since !== undefined && options.until !== undefined && options.since > options.until) {
    throw new InvalidInputError("Fill since must not exceed until");
  }
  if (options.markets !== undefined && !Array.isArray(options.markets)) {
    throw new InvalidInputError("Fill markets must be an array");
  }
  const markets = options.markets?.map((market) => {
    const normalized = normalizeFilter(market);
    if (normalized === undefined) throw new InvalidInputError("Fill market must be a non-empty string");
    return normalized;
  });
  const scope: FillsScope & { marketType?: MarketType } = {
    market: normalizeFilter(options.market),
    markets: markets === undefined ? undefined : [...new Set(markets)].sort(),
    pool: normalizeFilter(options.pool),
    since: options.since,
    until: options.until,
    // Normalized to a number so the same bound written as `900` and as `900n`
    // binds to ONE cursor: the binding is a hash of this object, and a bigint
    // does not survive JSON at all.
    sinceBlock:
      options.sinceBlock === undefined ? undefined : IndexerRead.blockHeight(options.sinceBlock, "sinceBlock"),
    toBlock: options.toBlock === undefined ? undefined : IndexerRead.blockHeight(options.toBlock, "toBlock"),
    // Last, and dropped by JSON when omitted: an unkinded page keeps the binding
    // its cursors already carry, while a kinded page binds to its kind.
    marketType: options.marketType === undefined ? undefined : marketKind(options.marketType),
  };
  if (scope.sinceBlock !== undefined && scope.toBlock !== undefined && scope.sinceBlock > scope.toBlock) {
    throw new InvalidInputError("sinceBlock must not exceed toBlock");
  }
  const acct = account.toLowerCase();
  // Bind scope without exposing endpoint credentials. This is not authentication or a dataset generation.
  const binding = keccak256(stringToHex(JSON.stringify([chainId, source, acct, scope, "timestamp/block/log:desc"])));
  return { account: acct, scope, limit, binding };
};

export const decode = (cursor: string, binding: string): { position: Position; generation: string | null } => {
  if (typeof cursor !== "string" || cursor.length > 1_024) throw new InvalidInputError("Invalid fill cursor");
  let value: unknown;
  try {
    value = JSON.parse(cursor);
  } catch (cause) {
    throw new InvalidInputError("Invalid fill cursor", { cause });
  }
  if (!Array.isArray(value) || (value.length !== 5 && value.length !== 6))
    throw new InvalidInputError("Invalid fill cursor");
  const [version, scope] = value;
  if (scope !== binding) throw new InvalidInputError("Invalid or foreign fill cursor");
  const legacy = version === 1 && value.length === 5;
  if (!legacy && (version !== 2 || value.length !== 6)) throw new InvalidInputError("Invalid fill cursor");
  const [timestamp, blockNumber, logIndex] = value.slice(legacy ? 2 : 3);
  if (!isDecimal(timestamp) || !isDecimal(blockNumber) || !isLogIndex(logIndex)) {
    throw new InvalidInputError("Invalid or foreign fill cursor");
  }
  const position = { timestamp, blockNumber, logIndex };
  if (legacy) return { position, generation: null };
  const generation = value[2];
  if (typeof generation !== "string" || !generation.length)
    throw new InvalidInputError("Invalid or foreign fill cursor");
  return { position, generation };
};

/**
 * Split a fetched page into the rows returned and the continuation.
 *
 * A FULL page continues, not only one that proved a further row with the
 * sentinel. Hasura's per-role row limit truncates silently: under a cap equal
 * to `limit`, the sentinel never arrives, and a sentinel-only rule would report
 * a range as drained while rows remain. The cost is one empty final page when a
 * range ends exactly on a page boundary.
 */
export const paginate = <R extends Position>(
  fetched: readonly R[],
  limit: number,
  binding: string,
  operation: string,
): { fills: R[]; nextCursor: string | null } => {
  const fills = fetched.slice(0, limit);
  const last = fills.at(-1);
  return { fills, nextCursor: fills.length === limit && last ? encode(last, binding, operation) : null };
};

/**
 * The failing read is named by its caller, so a shared helper never misreports it.
 * Account-page cursors carry a generation; range-page cursors retain v1.
 */
export const encode = (position: Position, binding: string, operation: string, generation?: string): string => {
  const cursor =
    generation === undefined
      ? JSON.stringify([1, binding, position.timestamp, position.blockNumber, position.logIndex])
      : JSON.stringify([2, binding, generation, position.timestamp, position.blockNumber, position.logIndex]);
  if (cursor.length > 1_024) throw new IndexerError(operation, "Fill position exceeds cursor bounds");
  return cursor;
};

export const validatePosition = (position: Position, operation: string): void => {
  if (
    typeof position !== "object" ||
    position === null ||
    !isDecimal(position.timestamp) ||
    !isDecimal(position.blockNumber) ||
    !isLogIndex(position.logIndex)
  ) {
    throw new IndexerError(operation, "Invalid fill position scalars");
  }
};

export const before = ({ timestamp, blockNumber, logIndex }: Position) => ({
  _or: [
    { timestamp: { _lt: timestamp } },
    { timestamp: { _eq: timestamp }, blockNumber: { _lt: blockNumber } },
    { timestamp: { _eq: timestamp }, blockNumber: { _eq: blockNumber }, logIndex: { _lt: logIndex } },
  ],
});

const MARKET_KINDS: readonly MarketType[] = ["SPOT", "PERP", "BINARY"];

/**
 * Validate a caller-supplied market kind before it becomes an indexer predicate.
 *
 * Lives here rather than in `fills.ts` so the range page and the head marker
 * reject an unknown kind with one message; every other input that enters a fill
 * page binding is normalized here too.
 */
export const marketKind = (value: MarketType): MarketType => {
  if (!MARKET_KINDS.includes(value)) {
    throw new InvalidInputError(`marketType must be one of ${MARKET_KINDS.join(", ")}`);
  }
  return value;
};

/**
 * Validate and normalize a block-range page request.
 *
 * The binding covers both bounds as well as the kind, so a cursor cannot be
 * carried from one range into another and silently skip the rows between them.
 * Bounds normalize to numbers for the same reason `sinceBlock` does above: a
 * bound written as `900` and as `900n` must bind to ONE cursor, and a bigint
 * does not survive JSON.
 */
export const prepareRange = ({
  options,
  chainId,
  source,
}: {
  options: FillsPageOptions;
  chainId: number;
  source: string;
}) => {
  // The options object is required, but an untyped caller can omit it; reading
  // `options.limit` would then throw a raw TypeError instead of the input error.
  if (typeof options !== "object" || options === null) {
    throw new InvalidInputError("Fill range options are required");
  }
  const limit = options.limit ?? 500;
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000) {
    throw new InvalidInputError("Fill page limit must be an integer from 1 to 1000");
  }
  const scope = {
    marketType: marketKind(options.marketType),
    sinceBlock: IndexerRead.blockHeight(options.sinceBlock, "sinceBlock"),
    toBlock: IndexerRead.blockHeight(options.toBlock, "toBlock"),
  };
  if (scope.sinceBlock > scope.toBlock) throw new InvalidInputError("sinceBlock must not exceed toBlock");
  const binding = keccak256(stringToHex(JSON.stringify([chainId, source, scope, "block/log:asc"])));
  return { scope, limit, binding };
};

/**
 * The predicate continuing an ASCENDING block-position page after `position`.
 *
 * Only the block position appears: `(blockNumber, logIndex)` is already a total
 * order over the table, so bringing the timestamp in would add a column without
 * breaking a single tie. It rides alongside the range's own `blockNumber`
 * bounds, which stay in force.
 */
export const after = ({ blockNumber, logIndex }: Position) => ({
  _or: [{ blockNumber: { _gt: blockNumber } }, { blockNumber: { _eq: blockNumber }, logIndex: { _gt: logIndex } }],
});
