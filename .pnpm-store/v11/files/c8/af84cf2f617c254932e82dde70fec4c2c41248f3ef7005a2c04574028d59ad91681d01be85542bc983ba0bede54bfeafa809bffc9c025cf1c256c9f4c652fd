/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { AccountCapabilityReadiness } from '../accountReadiness.js';
import { AccountChangeOperation } from '../accountChangeOperation.js';
import { BinaryFillKind, BinaryMarketStatus, BinarySide, OrderStatus } from '../store.js';
import { MarketType } from '../markets.js';
import { PerpPositionChangeKind } from '../perp/history.js';
import { StopOrderStatus } from '../spot/stops.js';
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'. */
export type Boolean_Comparison_Exp = {
  _eq?: boolean | null | undefined;
  _gt?: boolean | null | undefined;
  _gte?: boolean | null | undefined;
  _in?: Array<boolean> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: boolean | null | undefined;
  _lte?: boolean | null | undefined;
  _neq?: boolean | null | undefined;
  _nin?: Array<boolean> | null | undefined;
};

/** Boolean expression to filter rows from the table "BuilderApproval". All fields are combined with a logical 'AND'. */
export type BuilderApproval_Bool_Exp = {
  _and?: Array<BuilderApproval_Bool_Exp> | null | undefined;
  _not?: BuilderApproval_Bool_Exp | null | undefined;
  _or?: Array<BuilderApproval_Bool_Exp> | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  builder?: String_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  maxFeeBpsTimes1k?: Numeric_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
  user?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "BuilderFeeRecord". All fields are combined with a logical 'AND'. */
export type BuilderFeeRecord_Bool_Exp = {
  _and?: Array<BuilderFeeRecord_Bool_Exp> | null | undefined;
  _not?: BuilderFeeRecord_Bool_Exp | null | undefined;
  _or?: Array<BuilderFeeRecord_Bool_Exp> | null | undefined;
  amount?: Numeric_Comparison_Exp | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  builder?: String_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  orderId?: String_Comparison_Exp | null | undefined;
  payer?: String_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  token?: String_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

export type Candle_Aggregate_Bool_Exp = {
  count?: Candle_Aggregate_Bool_Exp_Count | null | undefined;
};

export type Candle_Aggregate_Bool_Exp_Count = {
  arguments?: Array<Candle_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: Candle_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** order by aggregate values of table "Candle" */
export type Candle_Aggregate_Order_By = {
  avg?: Candle_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Candle_Max_Order_By | null | undefined;
  min?: Candle_Min_Order_By | null | undefined;
  stddev?: Candle_Stddev_Order_By | null | undefined;
  stddev_pop?: Candle_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Candle_Stddev_Samp_Order_By | null | undefined;
  sum?: Candle_Sum_Order_By | null | undefined;
  var_pop?: Candle_Var_Pop_Order_By | null | undefined;
  var_samp?: Candle_Var_Samp_Order_By | null | undefined;
  variance?: Candle_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "Candle" */
export type Candle_Avg_Order_By = {
  baseVolume?: Order_By | null | undefined;
  bucketStart?: Order_By | null | undefined;
  closePrice?: Order_By | null | undefined;
  high?: Order_By | null | undefined;
  intervalSeconds?: Order_By | null | undefined;
  low?: Order_By | null | undefined;
  openPrice?: Order_By | null | undefined;
  quoteVolume?: Order_By | null | undefined;
  tradeCount?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "Candle". All fields are combined with a logical 'AND'. */
export type Candle_Bool_Exp = {
  _and?: Array<Candle_Bool_Exp> | null | undefined;
  _not?: Candle_Bool_Exp | null | undefined;
  _or?: Array<Candle_Bool_Exp> | null | undefined;
  baseVolume?: Numeric_Comparison_Exp | null | undefined;
  bucketStart?: Numeric_Comparison_Exp | null | undefined;
  closePrice?: Numeric_Comparison_Exp | null | undefined;
  high?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  intervalSeconds?: Int_Comparison_Exp | null | undefined;
  lastFillId?: String_Comparison_Exp | null | undefined;
  low?: Numeric_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  openPrice?: Numeric_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  quoteVolume?: Numeric_Comparison_Exp | null | undefined;
  tradeCount?: Int_Comparison_Exp | null | undefined;
};

/** order by max() on columns of table "Candle" */
export type Candle_Max_Order_By = {
  baseVolume?: Order_By | null | undefined;
  bucketStart?: Order_By | null | undefined;
  closePrice?: Order_By | null | undefined;
  high?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  intervalSeconds?: Order_By | null | undefined;
  lastFillId?: Order_By | null | undefined;
  low?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  openPrice?: Order_By | null | undefined;
  pool?: Order_By | null | undefined;
  quoteVolume?: Order_By | null | undefined;
  tradeCount?: Order_By | null | undefined;
};

/** order by min() on columns of table "Candle" */
export type Candle_Min_Order_By = {
  baseVolume?: Order_By | null | undefined;
  bucketStart?: Order_By | null | undefined;
  closePrice?: Order_By | null | undefined;
  high?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  intervalSeconds?: Order_By | null | undefined;
  lastFillId?: Order_By | null | undefined;
  low?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  openPrice?: Order_By | null | undefined;
  pool?: Order_By | null | undefined;
  quoteVolume?: Order_By | null | undefined;
  tradeCount?: Order_By | null | undefined;
};

/** select columns of table "Candle" */
export type Candle_Select_Column =
  /** column name */
  | 'baseVolume'
  /** column name */
  | 'bucketStart'
  /** column name */
  | 'closePrice'
  /** column name */
  | 'high'
  /** column name */
  | 'id'
  /** column name */
  | 'intervalSeconds'
  /** column name */
  | 'lastFillId'
  /** column name */
  | 'low'
  /** column name */
  | 'market_id'
  /** column name */
  | 'openPrice'
  /** column name */
  | 'pool'
  /** column name */
  | 'quoteVolume'
  /** column name */
  | 'tradeCount';

/** order by stddev() on columns of table "Candle" */
export type Candle_Stddev_Order_By = {
  baseVolume?: Order_By | null | undefined;
  bucketStart?: Order_By | null | undefined;
  closePrice?: Order_By | null | undefined;
  high?: Order_By | null | undefined;
  intervalSeconds?: Order_By | null | undefined;
  low?: Order_By | null | undefined;
  openPrice?: Order_By | null | undefined;
  quoteVolume?: Order_By | null | undefined;
  tradeCount?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "Candle" */
export type Candle_Stddev_Pop_Order_By = {
  baseVolume?: Order_By | null | undefined;
  bucketStart?: Order_By | null | undefined;
  closePrice?: Order_By | null | undefined;
  high?: Order_By | null | undefined;
  intervalSeconds?: Order_By | null | undefined;
  low?: Order_By | null | undefined;
  openPrice?: Order_By | null | undefined;
  quoteVolume?: Order_By | null | undefined;
  tradeCount?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "Candle" */
export type Candle_Stddev_Samp_Order_By = {
  baseVolume?: Order_By | null | undefined;
  bucketStart?: Order_By | null | undefined;
  closePrice?: Order_By | null | undefined;
  high?: Order_By | null | undefined;
  intervalSeconds?: Order_By | null | undefined;
  low?: Order_By | null | undefined;
  openPrice?: Order_By | null | undefined;
  quoteVolume?: Order_By | null | undefined;
  tradeCount?: Order_By | null | undefined;
};

/** order by sum() on columns of table "Candle" */
export type Candle_Sum_Order_By = {
  baseVolume?: Order_By | null | undefined;
  bucketStart?: Order_By | null | undefined;
  closePrice?: Order_By | null | undefined;
  high?: Order_By | null | undefined;
  intervalSeconds?: Order_By | null | undefined;
  low?: Order_By | null | undefined;
  openPrice?: Order_By | null | undefined;
  quoteVolume?: Order_By | null | undefined;
  tradeCount?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "Candle" */
export type Candle_Var_Pop_Order_By = {
  baseVolume?: Order_By | null | undefined;
  bucketStart?: Order_By | null | undefined;
  closePrice?: Order_By | null | undefined;
  high?: Order_By | null | undefined;
  intervalSeconds?: Order_By | null | undefined;
  low?: Order_By | null | undefined;
  openPrice?: Order_By | null | undefined;
  quoteVolume?: Order_By | null | undefined;
  tradeCount?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "Candle" */
export type Candle_Var_Samp_Order_By = {
  baseVolume?: Order_By | null | undefined;
  bucketStart?: Order_By | null | undefined;
  closePrice?: Order_By | null | undefined;
  high?: Order_By | null | undefined;
  intervalSeconds?: Order_By | null | undefined;
  low?: Order_By | null | undefined;
  openPrice?: Order_By | null | undefined;
  quoteVolume?: Order_By | null | undefined;
  tradeCount?: Order_By | null | undefined;
};

/** order by variance() on columns of table "Candle" */
export type Candle_Variance_Order_By = {
  baseVolume?: Order_By | null | undefined;
  bucketStart?: Order_By | null | undefined;
  closePrice?: Order_By | null | undefined;
  high?: Order_By | null | undefined;
  intervalSeconds?: Order_By | null | undefined;
  low?: Order_By | null | undefined;
  openPrice?: Order_By | null | undefined;
  quoteVolume?: Order_By | null | undefined;
  tradeCount?: Order_By | null | undefined;
};

export type Fill_Aggregate_Bool_Exp = {
  bool_and?: Fill_Aggregate_Bool_Exp_Bool_And | null | undefined;
  bool_or?: Fill_Aggregate_Bool_Exp_Bool_Or | null | undefined;
  count?: Fill_Aggregate_Bool_Exp_Count | null | undefined;
};

export type Fill_Aggregate_Bool_Exp_Bool_And = {
  arguments: Fill_Select_Column_Fill_Aggregate_Bool_Exp_Bool_And_Arguments_Columns;
  distinct?: boolean | null | undefined;
  filter?: Fill_Bool_Exp | null | undefined;
  predicate: Boolean_Comparison_Exp;
};

export type Fill_Aggregate_Bool_Exp_Bool_Or = {
  arguments: Fill_Select_Column_Fill_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns;
  distinct?: boolean | null | undefined;
  filter?: Fill_Bool_Exp | null | undefined;
  predicate: Boolean_Comparison_Exp;
};

export type Fill_Aggregate_Bool_Exp_Count = {
  arguments?: Array<Fill_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: Fill_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** order by aggregate values of table "Fill" */
export type Fill_Aggregate_Order_By = {
  avg?: Fill_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Fill_Max_Order_By | null | undefined;
  min?: Fill_Min_Order_By | null | undefined;
  stddev?: Fill_Stddev_Order_By | null | undefined;
  stddev_pop?: Fill_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Fill_Stddev_Samp_Order_By | null | undefined;
  sum?: Fill_Sum_Order_By | null | undefined;
  var_pop?: Fill_Var_Pop_Order_By | null | undefined;
  var_samp?: Fill_Var_Samp_Order_By | null | undefined;
  variance?: Fill_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "Fill" */
export type Fill_Avg_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Execution price (SPOT: maker limit price; BINARY: fillPrice / YES probability) */
  fillPrice?: Order_By | null | undefined;
  logIndex?: Order_By | null | undefined;
  makerOrderId?: Order_By | null | undefined;
  makerRemainingQuantity?: Order_By | null | undefined;
  /** Base/outcome quantity filled (raw) */
  quantity?: Order_By | null | undefined;
  /** Quote/collateral value = quantity * fillPrice / 10^baseDecimals (raw, floor) */
  quoteQuantity?: Order_By | null | undefined;
  takerOrderId?: Order_By | null | undefined;
  takerRemainingQuantity?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "Fill". All fields are combined with a logical 'AND'. */
export type Fill_Bool_Exp = {
  _and?: Array<Fill_Bool_Exp> | null | undefined;
  _not?: Fill_Bool_Exp | null | undefined;
  _or?: Array<Fill_Bool_Exp> | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  fillPrice?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  kind?: Clobfillkind_Comparison_Exp | null | undefined;
  logIndex?: Int_Comparison_Exp | null | undefined;
  maker?: String_Comparison_Exp | null | undefined;
  makerOrder?: Order_Bool_Exp | null | undefined;
  makerOrderId?: Numeric_Comparison_Exp | null | undefined;
  makerOrder_id?: String_Comparison_Exp | null | undefined;
  makerRemainingQuantity?: Numeric_Comparison_Exp | null | undefined;
  makerSide?: Cloborderside_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  marketType?: Markettype_Comparison_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  quantity?: Numeric_Comparison_Exp | null | undefined;
  quoteQuantity?: Numeric_Comparison_Exp | null | undefined;
  taker?: String_Comparison_Exp | null | undefined;
  takerIsBid?: Boolean_Comparison_Exp | null | undefined;
  takerOrder?: Order_Bool_Exp | null | undefined;
  takerOrderId?: Numeric_Comparison_Exp | null | undefined;
  takerOrder_id?: String_Comparison_Exp | null | undefined;
  takerRemainingQuantity?: Numeric_Comparison_Exp | null | undefined;
  takerSide?: Cloborderside_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** order by max() on columns of table "Fill" */
export type Fill_Max_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Execution price (SPOT: maker limit price; BINARY: fillPrice / YES probability) */
  fillPrice?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  /** BINARY only (derived once taker side is known) */
  kind?: Order_By | null | undefined;
  logIndex?: Order_By | null | undefined;
  maker?: Order_By | null | undefined;
  makerOrderId?: Order_By | null | undefined;
  makerOrder_id?: Order_By | null | undefined;
  makerRemainingQuantity?: Order_By | null | undefined;
  /** BINARY only */
  makerSide?: Order_By | null | undefined;
  /** Market kind of the pool the fill executed on (mirrors Market.marketType) */
  marketType?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  pool?: Order_By | null | undefined;
  /** Base/outcome quantity filled (raw) */
  quantity?: Order_By | null | undefined;
  /** Quote/collateral value = quantity * fillPrice / 10^baseDecimals (raw, floor) */
  quoteQuantity?: Order_By | null | undefined;
  /** Denormalized via the PendingTakerFill bridge (SPOT); the taker's OrderPlaced fires after the fill */
  taker?: Order_By | null | undefined;
  takerOrderId?: Order_By | null | undefined;
  takerOrder_id?: Order_By | null | undefined;
  takerRemainingQuantity?: Order_By | null | undefined;
  /** BINARY only */
  takerSide?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
  txHash?: Order_By | null | undefined;
};

/** order by min() on columns of table "Fill" */
export type Fill_Min_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Execution price (SPOT: maker limit price; BINARY: fillPrice / YES probability) */
  fillPrice?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  /** BINARY only (derived once taker side is known) */
  kind?: Order_By | null | undefined;
  logIndex?: Order_By | null | undefined;
  maker?: Order_By | null | undefined;
  makerOrderId?: Order_By | null | undefined;
  makerOrder_id?: Order_By | null | undefined;
  makerRemainingQuantity?: Order_By | null | undefined;
  /** BINARY only */
  makerSide?: Order_By | null | undefined;
  /** Market kind of the pool the fill executed on (mirrors Market.marketType) */
  marketType?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  pool?: Order_By | null | undefined;
  /** Base/outcome quantity filled (raw) */
  quantity?: Order_By | null | undefined;
  /** Quote/collateral value = quantity * fillPrice / 10^baseDecimals (raw, floor) */
  quoteQuantity?: Order_By | null | undefined;
  /** Denormalized via the PendingTakerFill bridge (SPOT); the taker's OrderPlaced fires after the fill */
  taker?: Order_By | null | undefined;
  takerOrderId?: Order_By | null | undefined;
  takerOrder_id?: Order_By | null | undefined;
  takerRemainingQuantity?: Order_By | null | undefined;
  /** BINARY only */
  takerSide?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
  txHash?: Order_By | null | undefined;
};

/** select columns of table "Fill" */
export type Fill_Select_Column =
  /** column name */
  | 'blockNumber'
  /** column name */
  | 'fillPrice'
  /** column name */
  | 'id'
  /** column name */
  | 'kind'
  /** column name */
  | 'logIndex'
  /** column name */
  | 'maker'
  /** column name */
  | 'makerOrderId'
  /** column name */
  | 'makerOrder_id'
  /** column name */
  | 'makerRemainingQuantity'
  /** column name */
  | 'makerSide'
  /** column name */
  | 'marketType'
  /** column name */
  | 'market_id'
  /** column name */
  | 'pool'
  /** column name */
  | 'quantity'
  /** column name */
  | 'quoteQuantity'
  /** column name */
  | 'taker'
  /** column name */
  | 'takerIsBid'
  /** column name */
  | 'takerOrderId'
  /** column name */
  | 'takerOrder_id'
  /** column name */
  | 'takerRemainingQuantity'
  /** column name */
  | 'takerSide'
  /** column name */
  | 'timestamp'
  /** column name */
  | 'txHash';

/** select "Fill_aggregate_bool_exp_bool_and_arguments_columns" columns of table "Fill" */
export type Fill_Select_Column_Fill_Aggregate_Bool_Exp_Bool_And_Arguments_Columns =
  /** column name */
  | 'takerIsBid';

/** select "Fill_aggregate_bool_exp_bool_or_arguments_columns" columns of table "Fill" */
export type Fill_Select_Column_Fill_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns =
  /** column name */
  | 'takerIsBid';

/** order by stddev() on columns of table "Fill" */
export type Fill_Stddev_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Execution price (SPOT: maker limit price; BINARY: fillPrice / YES probability) */
  fillPrice?: Order_By | null | undefined;
  logIndex?: Order_By | null | undefined;
  makerOrderId?: Order_By | null | undefined;
  makerRemainingQuantity?: Order_By | null | undefined;
  /** Base/outcome quantity filled (raw) */
  quantity?: Order_By | null | undefined;
  /** Quote/collateral value = quantity * fillPrice / 10^baseDecimals (raw, floor) */
  quoteQuantity?: Order_By | null | undefined;
  takerOrderId?: Order_By | null | undefined;
  takerRemainingQuantity?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "Fill" */
export type Fill_Stddev_Pop_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Execution price (SPOT: maker limit price; BINARY: fillPrice / YES probability) */
  fillPrice?: Order_By | null | undefined;
  logIndex?: Order_By | null | undefined;
  makerOrderId?: Order_By | null | undefined;
  makerRemainingQuantity?: Order_By | null | undefined;
  /** Base/outcome quantity filled (raw) */
  quantity?: Order_By | null | undefined;
  /** Quote/collateral value = quantity * fillPrice / 10^baseDecimals (raw, floor) */
  quoteQuantity?: Order_By | null | undefined;
  takerOrderId?: Order_By | null | undefined;
  takerRemainingQuantity?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "Fill" */
export type Fill_Stddev_Samp_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Execution price (SPOT: maker limit price; BINARY: fillPrice / YES probability) */
  fillPrice?: Order_By | null | undefined;
  logIndex?: Order_By | null | undefined;
  makerOrderId?: Order_By | null | undefined;
  makerRemainingQuantity?: Order_By | null | undefined;
  /** Base/outcome quantity filled (raw) */
  quantity?: Order_By | null | undefined;
  /** Quote/collateral value = quantity * fillPrice / 10^baseDecimals (raw, floor) */
  quoteQuantity?: Order_By | null | undefined;
  takerOrderId?: Order_By | null | undefined;
  takerRemainingQuantity?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by sum() on columns of table "Fill" */
export type Fill_Sum_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Execution price (SPOT: maker limit price; BINARY: fillPrice / YES probability) */
  fillPrice?: Order_By | null | undefined;
  logIndex?: Order_By | null | undefined;
  makerOrderId?: Order_By | null | undefined;
  makerRemainingQuantity?: Order_By | null | undefined;
  /** Base/outcome quantity filled (raw) */
  quantity?: Order_By | null | undefined;
  /** Quote/collateral value = quantity * fillPrice / 10^baseDecimals (raw, floor) */
  quoteQuantity?: Order_By | null | undefined;
  takerOrderId?: Order_By | null | undefined;
  takerRemainingQuantity?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "Fill" */
export type Fill_Var_Pop_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Execution price (SPOT: maker limit price; BINARY: fillPrice / YES probability) */
  fillPrice?: Order_By | null | undefined;
  logIndex?: Order_By | null | undefined;
  makerOrderId?: Order_By | null | undefined;
  makerRemainingQuantity?: Order_By | null | undefined;
  /** Base/outcome quantity filled (raw) */
  quantity?: Order_By | null | undefined;
  /** Quote/collateral value = quantity * fillPrice / 10^baseDecimals (raw, floor) */
  quoteQuantity?: Order_By | null | undefined;
  takerOrderId?: Order_By | null | undefined;
  takerRemainingQuantity?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "Fill" */
export type Fill_Var_Samp_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Execution price (SPOT: maker limit price; BINARY: fillPrice / YES probability) */
  fillPrice?: Order_By | null | undefined;
  logIndex?: Order_By | null | undefined;
  makerOrderId?: Order_By | null | undefined;
  makerRemainingQuantity?: Order_By | null | undefined;
  /** Base/outcome quantity filled (raw) */
  quantity?: Order_By | null | undefined;
  /** Quote/collateral value = quantity * fillPrice / 10^baseDecimals (raw, floor) */
  quoteQuantity?: Order_By | null | undefined;
  takerOrderId?: Order_By | null | undefined;
  takerRemainingQuantity?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by variance() on columns of table "Fill" */
export type Fill_Variance_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Execution price (SPOT: maker limit price; BINARY: fillPrice / YES probability) */
  fillPrice?: Order_By | null | undefined;
  logIndex?: Order_By | null | undefined;
  makerOrderId?: Order_By | null | undefined;
  makerRemainingQuantity?: Order_By | null | undefined;
  /** Base/outcome quantity filled (raw) */
  quantity?: Order_By | null | undefined;
  /** Quote/collateral value = quantity * fillPrice / 10^baseDecimals (raw, floor) */
  quoteQuantity?: Order_By | null | undefined;
  takerOrderId?: Order_By | null | undefined;
  takerRemainingQuantity?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "FundingPayment". All fields are combined with a logical 'AND'. */
export type FundingPayment_Bool_Exp = {
  _and?: Array<FundingPayment_Bool_Exp> | null | undefined;
  _not?: FundingPayment_Bool_Exp | null | undefined;
  _or?: Array<FundingPayment_Bool_Exp> | null | undefined;
  account?: String_Comparison_Exp | null | undefined;
  amount?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "FundingRateCandle". All fields are combined with a logical 'AND'. */
export type FundingRateCandle_Bool_Exp = {
  _and?: Array<FundingRateCandle_Bool_Exp> | null | undefined;
  _not?: FundingRateCandle_Bool_Exp | null | undefined;
  _or?: Array<FundingRateCandle_Bool_Exp> | null | undefined;
  avgFundingRate8h?: Numeric_Comparison_Exp | null | undefined;
  bucketStart?: Numeric_Comparison_Exp | null | undefined;
  coverage?: Numeric_Comparison_Exp | null | undefined;
  coveredSeconds?: Numeric_Comparison_Exp | null | undefined;
  cumulativeFundingEnd?: Numeric_Comparison_Exp | null | undefined;
  cumulativeFundingStart?: Numeric_Comparison_Exp | null | undefined;
  fundingIntervalSec?: Int_Comparison_Exp | null | undefined;
  fundingWindowSec?: Int_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  indexPriceEnd?: Numeric_Comparison_Exp | null | undefined;
  intervalSeconds?: Int_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  maxFundingRate8h?: Numeric_Comparison_Exp | null | undefined;
  minFundingRate8h?: Numeric_Comparison_Exp | null | undefined;
  openInterestEnd?: Numeric_Comparison_Exp | null | undefined;
  paramsChangedInBucket?: Boolean_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  updateCount?: Int_Comparison_Exp | null | undefined;
  weightedRate8hSeconds?: Numeric_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "FundingRateUpdate". All fields are combined with a logical 'AND'. */
export type FundingRateUpdate_Bool_Exp = {
  _and?: Array<FundingRateUpdate_Bool_Exp> | null | undefined;
  _not?: FundingRateUpdate_Bool_Exp | null | undefined;
  _or?: Array<FundingRateUpdate_Bool_Exp> | null | undefined;
  anchorResynced?: Boolean_Comparison_Exp | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  cumulativeFundingPerUnit?: Numeric_Comparison_Exp | null | undefined;
  fundingIntervalSec?: Int_Comparison_Exp | null | undefined;
  fundingRate?: Numeric_Comparison_Exp | null | undefined;
  fundingWindowSec?: Int_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  indexPrice?: Numeric_Comparison_Exp | null | undefined;
  intervalsAccrued?: Numeric_Comparison_Exp | null | undefined;
  intervalsSettled?: Numeric_Comparison_Exp | null | undefined;
  markPrice?: Numeric_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  spanEnd?: Numeric_Comparison_Exp | null | undefined;
  spanStart?: Numeric_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Ordering options when selecting data from "FundingRateUpdate". */
export type FundingRateUpdate_Order_By = {
  anchorResynced?: Order_By | null | undefined;
  blockNumber?: Order_By | null | undefined;
  cumulativeFundingPerUnit?: Order_By | null | undefined;
  fundingIntervalSec?: Order_By | null | undefined;
  fundingRate?: Order_By | null | undefined;
  fundingWindowSec?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  indexPrice?: Order_By | null | undefined;
  intervalsAccrued?: Order_By | null | undefined;
  intervalsSettled?: Order_By | null | undefined;
  markPrice?: Order_By | null | undefined;
  market?: Market_Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  pool?: Order_By | null | undefined;
  spanEnd?: Order_By | null | undefined;
  spanStart?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
  txHash?: Order_By | null | undefined;
};

/** Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'. */
export type Int_Comparison_Exp = {
  _eq?: number | null | undefined;
  _gt?: number | null | undefined;
  _gte?: number | null | undefined;
  _in?: Array<number> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: number | null | undefined;
  _lte?: number | null | undefined;
  _neq?: number | null | undefined;
  _nin?: Array<number> | null | undefined;
};

/** Boolean expression to filter rows from the table "LiquidationEvent". All fields are combined with a logical 'AND'. */
export type LiquidationEvent_Bool_Exp = {
  _and?: Array<LiquidationEvent_Bool_Exp> | null | undefined;
  _not?: LiquidationEvent_Bool_Exp | null | undefined;
  _or?: Array<LiquidationEvent_Bool_Exp> | null | undefined;
  account?: String_Comparison_Exp | null | undefined;
  attributable?: Numeric_Comparison_Exp | null | undefined;
  badDebt?: Numeric_Comparison_Exp | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  blockVolume?: Numeric_Comparison_Exp | null | undefined;
  clampedBound?: Numeric_Comparison_Exp | null | undefined;
  collateralAmount?: Numeric_Comparison_Exp | null | undefined;
  counterparty?: String_Comparison_Exp | null | undefined;
  coverageDeclined?: Numeric_Comparison_Exp | null | undefined;
  deficit?: Numeric_Comparison_Exp | null | undefined;
  equity?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  insuranceCovered?: Numeric_Comparison_Exp | null | undefined;
  keeperReward?: Numeric_Comparison_Exp | null | undefined;
  kind?: String_Comparison_Exp | null | undefined;
  marginStatusAfter?: Int_Comparison_Exp | null | undefined;
  marginStatusBefore?: Int_Comparison_Exp | null | undefined;
  marketBound?: Numeric_Comparison_Exp | null | undefined;
  panicCode?: Numeric_Comparison_Exp | null | undefined;
  penalty?: Numeric_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  positionsProcessed?: Numeric_Comparison_Exp | null | undefined;
  price?: Numeric_Comparison_Exp | null | undefined;
  residualAdded?: Numeric_Comparison_Exp | null | undefined;
  residualMarketTotal?: Numeric_Comparison_Exp | null | undefined;
  residualUnpriceable?: Numeric_Comparison_Exp | null | undefined;
  size?: Numeric_Comparison_Exp | null | undefined;
  stageReached?: Int_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
  volumeCap?: Numeric_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "MarginEvent". All fields are combined with a logical 'AND'. */
export type MarginEvent_Bool_Exp = {
  _and?: Array<MarginEvent_Bool_Exp> | null | undefined;
  _not?: MarginEvent_Bool_Exp | null | undefined;
  _or?: Array<MarginEvent_Bool_Exp> | null | undefined;
  account?: String_Comparison_Exp | null | undefined;
  amount?: Numeric_Comparison_Exp | null | undefined;
  granter?: String_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  kind?: String_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "MarketCreator". All fields are combined with a logical 'AND'. */
export type MarketCreator_Bool_Exp = {
  _and?: Array<MarketCreator_Bool_Exp> | null | undefined;
  _not?: MarketCreator_Bool_Exp | null | undefined;
  _or?: Array<MarketCreator_Bool_Exp> | null | undefined;
  adapter?: String_Comparison_Exp | null | undefined;
  core?: String_Comparison_Exp | null | undefined;
  createdAtBlock?: Int_Comparison_Exp | null | undefined;
  createdAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  factory?: String_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  operatorId?: Int_Comparison_Exp | null | undefined;
  owner?: String_Comparison_Exp | null | undefined;
  policy?: String_Comparison_Exp | null | undefined;
  series?: Series_Bool_Exp | null | undefined;
  series_aggregate?: Series_Aggregate_Bool_Exp | null | undefined;
  venueId?: String_Comparison_Exp | null | undefined;
};

/** Ordering options when selecting data from "MarketCreator". */
export type MarketCreator_Order_By = {
  adapter?: Order_By | null | undefined;
  core?: Order_By | null | undefined;
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  factory?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  operatorId?: Order_By | null | undefined;
  owner?: Order_By | null | undefined;
  policy?: Order_By | null | undefined;
  series_aggregate?: Series_Aggregate_Order_By | null | undefined;
  venueId?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "MarketReferenceLink". All fields are combined with a logical 'AND'. */
export type MarketReferenceLink_Bool_Exp = {
  _and?: Array<MarketReferenceLink_Bool_Exp> | null | undefined;
  _not?: MarketReferenceLink_Bool_Exp | null | undefined;
  _or?: Array<MarketReferenceLink_Bool_Exp> | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  pending?: Boolean_Comparison_Exp | null | undefined;
  referenceQuestionId?: Numeric_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "MarketResolutionEvent". All fields are combined with a logical 'AND'. */
export type MarketResolutionEvent_Bool_Exp = {
  _and?: Array<MarketResolutionEvent_Bool_Exp> | null | undefined;
  _not?: MarketResolutionEvent_Bool_Exp | null | undefined;
  _or?: Array<MarketResolutionEvent_Bool_Exp> | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  kind?: String_Comparison_Exp | null | undefined;
  logIndex?: Int_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  oracleQuestionId?: Numeric_Comparison_Exp | null | undefined;
  outcomeIdx?: Int_Comparison_Exp | null | undefined;
  outcomeSlotCount?: Int_Comparison_Exp | null | undefined;
  payoutDenominator?: Numeric_Comparison_Exp | null | undefined;
  payoutNumerators?: String_Array_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
  voided?: Boolean_Comparison_Exp | null | undefined;
};

export type MarketStatusUpdate_Aggregate_Bool_Exp = {
  count?: MarketStatusUpdate_Aggregate_Bool_Exp_Count | null | undefined;
};

export type MarketStatusUpdate_Aggregate_Bool_Exp_Count = {
  arguments?: Array<MarketStatusUpdate_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: MarketStatusUpdate_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** order by aggregate values of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Aggregate_Order_By = {
  avg?: MarketStatusUpdate_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: MarketStatusUpdate_Max_Order_By | null | undefined;
  min?: MarketStatusUpdate_Min_Order_By | null | undefined;
  stddev?: MarketStatusUpdate_Stddev_Order_By | null | undefined;
  stddev_pop?: MarketStatusUpdate_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: MarketStatusUpdate_Stddev_Samp_Order_By | null | undefined;
  sum?: MarketStatusUpdate_Sum_Order_By | null | undefined;
  var_pop?: MarketStatusUpdate_Var_Pop_Order_By | null | undefined;
  var_samp?: MarketStatusUpdate_Var_Samp_Order_By | null | undefined;
  variance?: MarketStatusUpdate_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Avg_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Position of the emitting log within its block. With (timestamp, blockNumber) this totally orders the merged activity feed, which the id cannot: the id is a STRING, so `100_9` sorts after `100_10` lexicographically. */
  logIndex?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "MarketStatusUpdate". All fields are combined with a logical 'AND'. */
export type MarketStatusUpdate_Bool_Exp = {
  _and?: Array<MarketStatusUpdate_Bool_Exp> | null | undefined;
  _not?: MarketStatusUpdate_Bool_Exp | null | undefined;
  _or?: Array<MarketStatusUpdate_Bool_Exp> | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  logIndex?: Int_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  newStatus?: Clobmarketstatus_Comparison_Exp | null | undefined;
  oldStatus?: Clobmarketstatus_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** order by max() on columns of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Max_Order_By = {
  blockNumber?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  /** Position of the emitting log within its block. With (timestamp, blockNumber) this totally orders the merged activity feed, which the id cannot: the id is a STRING, so `100_9` sorts after `100_10` lexicographically. */
  logIndex?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  newStatus?: Order_By | null | undefined;
  oldStatus?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
  txHash?: Order_By | null | undefined;
};

/** order by min() on columns of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Min_Order_By = {
  blockNumber?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  /** Position of the emitting log within its block. With (timestamp, blockNumber) this totally orders the merged activity feed, which the id cannot: the id is a STRING, so `100_9` sorts after `100_10` lexicographically. */
  logIndex?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  newStatus?: Order_By | null | undefined;
  oldStatus?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
  txHash?: Order_By | null | undefined;
};

/** select columns of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Select_Column =
  /** column name */
  | 'blockNumber'
  /** column name */
  | 'id'
  /** column name */
  | 'logIndex'
  /** column name */
  | 'market_id'
  /** column name */
  | 'newStatus'
  /** column name */
  | 'oldStatus'
  /** column name */
  | 'timestamp'
  /** column name */
  | 'txHash';

/** order by stddev() on columns of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Stddev_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Position of the emitting log within its block. With (timestamp, blockNumber) this totally orders the merged activity feed, which the id cannot: the id is a STRING, so `100_9` sorts after `100_10` lexicographically. */
  logIndex?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Stddev_Pop_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Position of the emitting log within its block. With (timestamp, blockNumber) this totally orders the merged activity feed, which the id cannot: the id is a STRING, so `100_9` sorts after `100_10` lexicographically. */
  logIndex?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Stddev_Samp_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Position of the emitting log within its block. With (timestamp, blockNumber) this totally orders the merged activity feed, which the id cannot: the id is a STRING, so `100_9` sorts after `100_10` lexicographically. */
  logIndex?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by sum() on columns of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Sum_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Position of the emitting log within its block. With (timestamp, blockNumber) this totally orders the merged activity feed, which the id cannot: the id is a STRING, so `100_9` sorts after `100_10` lexicographically. */
  logIndex?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Var_Pop_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Position of the emitting log within its block. With (timestamp, blockNumber) this totally orders the merged activity feed, which the id cannot: the id is a STRING, so `100_9` sorts after `100_10` lexicographically. */
  logIndex?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Var_Samp_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Position of the emitting log within its block. With (timestamp, blockNumber) this totally orders the merged activity feed, which the id cannot: the id is a STRING, so `100_9` sorts after `100_10` lexicographically. */
  logIndex?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** order by variance() on columns of table "MarketStatusUpdate" */
export type MarketStatusUpdate_Variance_Order_By = {
  blockNumber?: Order_By | null | undefined;
  /** Position of the emitting log within its block. With (timestamp, blockNumber) this totally orders the merged activity feed, which the id cannot: the id is a STRING, so `100_9` sorts after `100_10` lexicographically. */
  logIndex?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "Market". All fields are combined with a logical 'AND'. */
export type Market_Bool_Exp = {
  _and?: Array<Market_Bool_Exp> | null | undefined;
  _not?: Market_Bool_Exp | null | undefined;
  _or?: Array<Market_Bool_Exp> | null | undefined;
  asset?: String_Comparison_Exp | null | undefined;
  backing?: Numeric_Comparison_Exp | null | undefined;
  baseDecimals?: Int_Comparison_Exp | null | undefined;
  baseIsNative?: Boolean_Comparison_Exp | null | undefined;
  baseSymbol?: String_Comparison_Exp | null | undefined;
  baseToken?: String_Comparison_Exp | null | undefined;
  binaryPoolAddress?: String_Comparison_Exp | null | undefined;
  candles?: Candle_Bool_Exp | null | undefined;
  candles_aggregate?: Candle_Aggregate_Bool_Exp | null | undefined;
  clobStatus?: Clobmarketstatus_Comparison_Exp | null | undefined;
  closingCaptureState?: Int_Comparison_Exp | null | undefined;
  closingMid?: Numeric_Comparison_Exp | null | undefined;
  collateral?: String_Comparison_Exp | null | undefined;
  context?: String_Comparison_Exp | null | undefined;
  createdAtBlock?: Numeric_Comparison_Exp | null | undefined;
  createdAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  createdByTx?: String_Comparison_Exp | null | undefined;
  creator?: String_Comparison_Exp | null | undefined;
  cumulativeBaseVolume?: Numeric_Comparison_Exp | null | undefined;
  cumulativeFundingPerUnit?: Numeric_Comparison_Exp | null | undefined;
  cumulativeQuoteVolume?: Numeric_Comparison_Exp | null | undefined;
  delistEscrowSeconds?: Numeric_Comparison_Exp | null | undefined;
  delistedAt?: Numeric_Comparison_Exp | null | undefined;
  expiry?: Numeric_Comparison_Exp | null | undefined;
  fills?: Fill_Bool_Exp | null | undefined;
  fills_aggregate?: Fill_Aggregate_Bool_Exp | null | undefined;
  finalized?: Boolean_Comparison_Exp | null | undefined;
  fundingIntervalSec?: Int_Comparison_Exp | null | undefined;
  fundingRate?: Numeric_Comparison_Exp | null | undefined;
  fundingUpdatedAt?: Numeric_Comparison_Exp | null | undefined;
  fundingWindowSec?: Int_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  indexPrice?: Numeric_Comparison_Exp | null | undefined;
  initialMarginBps?: Int_Comparison_Exp | null | undefined;
  intervalSec?: Numeric_Comparison_Exp | null | undefined;
  lastPrice?: Numeric_Comparison_Exp | null | undefined;
  lastTradeAt?: Numeric_Comparison_Exp | null | undefined;
  lotSize?: Numeric_Comparison_Exp | null | undefined;
  marginBank?: String_Comparison_Exp | null | undefined;
  markPrice?: Numeric_Comparison_Exp | null | undefined;
  markPriceUpdatedAt?: Numeric_Comparison_Exp | null | undefined;
  marketAddress?: String_Comparison_Exp | null | undefined;
  marketId?: String_Comparison_Exp | null | undefined;
  marketType?: Markettype_Comparison_Exp | null | undefined;
  minQuantity?: Numeric_Comparison_Exp | null | undefined;
  moduleAddress?: String_Comparison_Exp | null | undefined;
  netBacking?: Numeric_Comparison_Exp | null | undefined;
  noTokenId?: String_Comparison_Exp | null | undefined;
  nonce?: Numeric_Comparison_Exp | null | undefined;
  openInterest?: Numeric_Comparison_Exp | null | undefined;
  openInterestUpdatedAt?: Numeric_Comparison_Exp | null | undefined;
  operatorId?: Int_Comparison_Exp | null | undefined;
  oracleQuestion?: String_Comparison_Exp | null | undefined;
  oracleQuestionId?: Numeric_Comparison_Exp | null | undefined;
  orders?: Order_Bool_Exp | null | undefined;
  orders_aggregate?: Order_Aggregate_Bool_Exp | null | undefined;
  outcomeBalances?: OutcomeBalance_Bool_Exp | null | undefined;
  outcomeBalances_aggregate?: OutcomeBalance_Aggregate_Bool_Exp | null | undefined;
  outcomeSlotCount?: Int_Comparison_Exp | null | undefined;
  payoutDenominator?: Numeric_Comparison_Exp | null | undefined;
  payoutNumerators?: String_Array_Comparison_Exp | null | undefined;
  perpRegistered?: Boolean_Comparison_Exp | null | undefined;
  perpRestricted?: Boolean_Comparison_Exp | null | undefined;
  perpStatus?: String_Comparison_Exp | null | undefined;
  perpStatusUpdatedAt?: Numeric_Comparison_Exp | null | undefined;
  poolAddress?: String_Comparison_Exp | null | undefined;
  question?: String_Comparison_Exp | null | undefined;
  quoteDecimals?: Int_Comparison_Exp | null | undefined;
  quoteSymbol?: String_Comparison_Exp | null | undefined;
  quoteToken?: String_Comparison_Exp | null | undefined;
  rawMidpoint?: Numeric_Comparison_Exp | null | undefined;
  resolvedAtBlock?: Numeric_Comparison_Exp | null | undefined;
  resolvedAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  schedulerCadenceIntervalSec?: Numeric_Comparison_Exp | null | undefined;
  schedulerCadenceLastIncompatibleAt?: Numeric_Comparison_Exp | null | undefined;
  schedulerCadenceMaxSampleGapSec?: Numeric_Comparison_Exp | null | undefined;
  schedulerPrepared?: Boolean_Comparison_Exp | null | undefined;
  series?: Series_Bool_Exp | null | undefined;
  series_id?: String_Comparison_Exp | null | undefined;
  settledPayoutNumerators?: String_Array_Comparison_Exp | null | undefined;
  settlementConfigDwellSeconds?: Numeric_Comparison_Exp | null | undefined;
  settlementConfigMaxSampleGapSec?: Numeric_Comparison_Exp | null | undefined;
  settlementConfigMinLeadSeconds?: Numeric_Comparison_Exp | null | undefined;
  settlementConfigMinSampleCount?: Int_Comparison_Exp | null | undefined;
  settlementConfigMinTwapWindowSec?: Numeric_Comparison_Exp | null | undefined;
  settlementConfigTwapWindowSec?: Numeric_Comparison_Exp | null | undefined;
  settlementDwellEndsAt?: Numeric_Comparison_Exp | null | undefined;
  settlementDwellSeconds?: Numeric_Comparison_Exp | null | undefined;
  settlementEnteredAt?: Numeric_Comparison_Exp | null | undefined;
  settlementPrice?: Numeric_Comparison_Exp | null | undefined;
  settlementResidual?: Numeric_Comparison_Exp | null | undefined;
  settlementSampleCount?: Int_Comparison_Exp | null | undefined;
  settlementTime?: Numeric_Comparison_Exp | null | undefined;
  settlementTwapWindowSec?: Numeric_Comparison_Exp | null | undefined;
  settlementWindowOpensAt?: Numeric_Comparison_Exp | null | undefined;
  statusUpdates?: MarketStatusUpdate_Bool_Exp | null | undefined;
  statusUpdates_aggregate?: MarketStatusUpdate_Aggregate_Bool_Exp | null | undefined;
  stopOrders?: StopOrder_Bool_Exp | null | undefined;
  stopOrders_aggregate?: StopOrder_Aggregate_Bool_Exp | null | undefined;
  stopRegistry?: String_Comparison_Exp | null | undefined;
  strike?: Numeric_Comparison_Exp | null | undefined;
  tickSize?: Numeric_Comparison_Exp | null | undefined;
  tradeCount?: Numeric_Comparison_Exp | null | undefined;
  tradingStart?: Numeric_Comparison_Exp | null | undefined;
  venueId?: String_Comparison_Exp | null | undefined;
  voidPolicy?: Int_Comparison_Exp | null | undefined;
  voidVectorSource?: Int_Comparison_Exp | null | undefined;
  voided?: Boolean_Comparison_Exp | null | undefined;
  winningOutcome?: Int_Comparison_Exp | null | undefined;
  yesTokenId?: String_Comparison_Exp | null | undefined;
};

/** Ordering options when selecting data from "Market". */
export type Market_Order_By = {
  asset?: Order_By | null | undefined;
  backing?: Order_By | null | undefined;
  baseDecimals?: Order_By | null | undefined;
  baseIsNative?: Order_By | null | undefined;
  baseSymbol?: Order_By | null | undefined;
  baseToken?: Order_By | null | undefined;
  binaryPoolAddress?: Order_By | null | undefined;
  candles_aggregate?: Candle_Aggregate_Order_By | null | undefined;
  clobStatus?: Order_By | null | undefined;
  closingCaptureState?: Order_By | null | undefined;
  closingMid?: Order_By | null | undefined;
  collateral?: Order_By | null | undefined;
  context?: Order_By | null | undefined;
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  createdByTx?: Order_By | null | undefined;
  creator?: Order_By | null | undefined;
  cumulativeBaseVolume?: Order_By | null | undefined;
  cumulativeFundingPerUnit?: Order_By | null | undefined;
  cumulativeQuoteVolume?: Order_By | null | undefined;
  delistEscrowSeconds?: Order_By | null | undefined;
  delistedAt?: Order_By | null | undefined;
  expiry?: Order_By | null | undefined;
  fills_aggregate?: Fill_Aggregate_Order_By | null | undefined;
  finalized?: Order_By | null | undefined;
  fundingIntervalSec?: Order_By | null | undefined;
  fundingRate?: Order_By | null | undefined;
  fundingUpdatedAt?: Order_By | null | undefined;
  fundingWindowSec?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  indexPrice?: Order_By | null | undefined;
  initialMarginBps?: Order_By | null | undefined;
  intervalSec?: Order_By | null | undefined;
  lastPrice?: Order_By | null | undefined;
  lastTradeAt?: Order_By | null | undefined;
  lotSize?: Order_By | null | undefined;
  marginBank?: Order_By | null | undefined;
  markPrice?: Order_By | null | undefined;
  markPriceUpdatedAt?: Order_By | null | undefined;
  marketAddress?: Order_By | null | undefined;
  marketId?: Order_By | null | undefined;
  marketType?: Order_By | null | undefined;
  minQuantity?: Order_By | null | undefined;
  moduleAddress?: Order_By | null | undefined;
  netBacking?: Order_By | null | undefined;
  noTokenId?: Order_By | null | undefined;
  nonce?: Order_By | null | undefined;
  openInterest?: Order_By | null | undefined;
  openInterestUpdatedAt?: Order_By | null | undefined;
  operatorId?: Order_By | null | undefined;
  oracleQuestion?: Order_By | null | undefined;
  oracleQuestionId?: Order_By | null | undefined;
  orders_aggregate?: Order_Aggregate_Order_By | null | undefined;
  outcomeBalances_aggregate?: OutcomeBalance_Aggregate_Order_By | null | undefined;
  outcomeSlotCount?: Order_By | null | undefined;
  payoutDenominator?: Order_By | null | undefined;
  payoutNumerators?: Order_By | null | undefined;
  perpRegistered?: Order_By | null | undefined;
  perpRestricted?: Order_By | null | undefined;
  perpStatus?: Order_By | null | undefined;
  perpStatusUpdatedAt?: Order_By | null | undefined;
  poolAddress?: Order_By | null | undefined;
  question?: Order_By | null | undefined;
  quoteDecimals?: Order_By | null | undefined;
  quoteSymbol?: Order_By | null | undefined;
  quoteToken?: Order_By | null | undefined;
  rawMidpoint?: Order_By | null | undefined;
  resolvedAtBlock?: Order_By | null | undefined;
  resolvedAtTimestamp?: Order_By | null | undefined;
  schedulerCadenceIntervalSec?: Order_By | null | undefined;
  schedulerCadenceLastIncompatibleAt?: Order_By | null | undefined;
  schedulerCadenceMaxSampleGapSec?: Order_By | null | undefined;
  schedulerPrepared?: Order_By | null | undefined;
  series?: Series_Order_By | null | undefined;
  series_id?: Order_By | null | undefined;
  settledPayoutNumerators?: Order_By | null | undefined;
  settlementConfigDwellSeconds?: Order_By | null | undefined;
  settlementConfigMaxSampleGapSec?: Order_By | null | undefined;
  settlementConfigMinLeadSeconds?: Order_By | null | undefined;
  settlementConfigMinSampleCount?: Order_By | null | undefined;
  settlementConfigMinTwapWindowSec?: Order_By | null | undefined;
  settlementConfigTwapWindowSec?: Order_By | null | undefined;
  settlementDwellEndsAt?: Order_By | null | undefined;
  settlementDwellSeconds?: Order_By | null | undefined;
  settlementEnteredAt?: Order_By | null | undefined;
  settlementPrice?: Order_By | null | undefined;
  settlementResidual?: Order_By | null | undefined;
  settlementSampleCount?: Order_By | null | undefined;
  settlementTime?: Order_By | null | undefined;
  settlementTwapWindowSec?: Order_By | null | undefined;
  settlementWindowOpensAt?: Order_By | null | undefined;
  statusUpdates_aggregate?: MarketStatusUpdate_Aggregate_Order_By | null | undefined;
  stopOrders_aggregate?: StopOrder_Aggregate_Order_By | null | undefined;
  stopRegistry?: Order_By | null | undefined;
  strike?: Order_By | null | undefined;
  tickSize?: Order_By | null | undefined;
  tradeCount?: Order_By | null | undefined;
  tradingStart?: Order_By | null | undefined;
  venueId?: Order_By | null | undefined;
  voidPolicy?: Order_By | null | undefined;
  voidVectorSource?: Order_By | null | undefined;
  voided?: Order_By | null | undefined;
  winningOutcome?: Order_By | null | undefined;
  yesTokenId?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "Operator". All fields are combined with a logical 'AND'. */
export type Operator_Bool_Exp = {
  _and?: Array<Operator_Bool_Exp> | null | undefined;
  _not?: Operator_Bool_Exp | null | undefined;
  _or?: Array<Operator_Bool_Exp> | null | undefined;
  builderFeesCollected?: Numeric_Comparison_Exp | null | undefined;
  context?: String_Comparison_Exp | null | undefined;
  createdAtBlock?: Numeric_Comparison_Exp | null | undefined;
  createdAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  cumulativeQuoteVolume?: Numeric_Comparison_Exp | null | undefined;
  enabled?: Boolean_Comparison_Exp | null | undefined;
  feeRecipient?: String_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  marketCount?: Int_Comparison_Exp | null | undefined;
  operatorId?: Int_Comparison_Exp | null | undefined;
  owner?: String_Comparison_Exp | null | undefined;
  pendingOwner?: String_Comparison_Exp | null | undefined;
  policy?: String_Comparison_Exp | null | undefined;
  protocolFeesCollected?: Numeric_Comparison_Exp | null | undefined;
  settlementFeesCollected?: Numeric_Comparison_Exp | null | undefined;
  updatedAtBlock?: Numeric_Comparison_Exp | null | undefined;
  updatedAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  venueCount?: Int_Comparison_Exp | null | undefined;
  venues?: Venue_Bool_Exp | null | undefined;
  venues_aggregate?: Venue_Aggregate_Bool_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "OracleAdapter". All fields are combined with a logical 'AND'. */
export type OracleAdapter_Bool_Exp = {
  _and?: Array<OracleAdapter_Bool_Exp> | null | undefined;
  _not?: OracleAdapter_Bool_Exp | null | undefined;
  _or?: Array<OracleAdapter_Bool_Exp> | null | undefined;
  approved?: Boolean_Comparison_Exp | null | undefined;
  approvedAtBlock?: Int_Comparison_Exp | null | undefined;
  approvedAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  createdAtBlock?: Int_Comparison_Exp | null | undefined;
  createdAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  factory?: String_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  owner?: String_Comparison_Exp | null | undefined;
};

export type OracleBind_Aggregate_Bool_Exp = {
  count?: OracleBind_Aggregate_Bool_Exp_Count | null | undefined;
};

export type OracleBind_Aggregate_Bool_Exp_Count = {
  arguments?: Array<OracleBind_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: OracleBind_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** Boolean expression to filter rows from the table "OracleBind". All fields are combined with a logical 'AND'. */
export type OracleBind_Bool_Exp = {
  _and?: Array<OracleBind_Bool_Exp> | null | undefined;
  _not?: OracleBind_Bool_Exp | null | undefined;
  _or?: Array<OracleBind_Bool_Exp> | null | undefined;
  bindIndex?: Int_Comparison_Exp | null | undefined;
  boundAtBlock?: Numeric_Comparison_Exp | null | undefined;
  boundAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  charged?: Numeric_Comparison_Exp | null | undefined;
  cost?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  measuredGas?: Numeric_Comparison_Exp | null | undefined;
  operatorId?: Int_Comparison_Exp | null | undefined;
  oracleQuestionId?: Numeric_Comparison_Exp | null | undefined;
  overheadShare?: Numeric_Comparison_Exp | null | undefined;
  question?: OracleQuestion_Bool_Exp | null | undefined;
  question_id?: String_Comparison_Exp | null | undefined;
  resolvedAt?: Numeric_Comparison_Exp | null | undefined;
  resolvedAtBlock?: Numeric_Comparison_Exp | null | undefined;
  subsidy?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** select columns of table "OracleBind" */
export type OracleBind_Select_Column =
  /** column name */
  | 'bindIndex'
  /** column name */
  | 'boundAtBlock'
  /** column name */
  | 'boundAtTimestamp'
  /** column name */
  | 'charged'
  /** column name */
  | 'cost'
  /** column name */
  | 'id'
  /** column name */
  | 'market_id'
  /** column name */
  | 'measuredGas'
  /** column name */
  | 'operatorId'
  /** column name */
  | 'oracleQuestionId'
  /** column name */
  | 'overheadShare'
  /** column name */
  | 'question_id'
  /** column name */
  | 'resolvedAt'
  /** column name */
  | 'resolvedAtBlock'
  /** column name */
  | 'subsidy'
  /** column name */
  | 'txHash';

/** Boolean expression to filter rows from the table "OracleQuestion". All fields are combined with a logical 'AND'. */
export type OracleQuestion_Bool_Exp = {
  _and?: Array<OracleQuestion_Bool_Exp> | null | undefined;
  _not?: OracleQuestion_Bool_Exp | null | undefined;
  _or?: Array<OracleQuestion_Bool_Exp> | null | undefined;
  bindCount?: Int_Comparison_Exp | null | undefined;
  binds?: OracleBind_Bool_Exp | null | undefined;
  binds_aggregate?: OracleBind_Aggregate_Bool_Exp | null | undefined;
  createdAtBlock?: Numeric_Comparison_Exp | null | undefined;
  createdAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  oracleCost?: Numeric_Comparison_Exp | null | undefined;
  oracleQuestionId?: Numeric_Comparison_Exp | null | undefined;
  payoutDenominator?: Numeric_Comparison_Exp | null | undefined;
  payoutNumerators?: String_Array_Comparison_Exp | null | undefined;
  questionKey?: String_Comparison_Exp | null | undefined;
  resolvedAt?: Numeric_Comparison_Exp | null | undefined;
  resolvedAtBlock?: Numeric_Comparison_Exp | null | undefined;
  reuseCount?: Int_Comparison_Exp | null | undefined;
  scheduler?: String_Comparison_Exp | null | undefined;
  supersededByQuestionId?: Numeric_Comparison_Exp | null | undefined;
  voided?: Boolean_Comparison_Exp | null | undefined;
};

export type Order_Aggregate_Bool_Exp = {
  bool_and?: Order_Aggregate_Bool_Exp_Bool_And | null | undefined;
  bool_or?: Order_Aggregate_Bool_Exp_Bool_Or | null | undefined;
  count?: Order_Aggregate_Bool_Exp_Count | null | undefined;
};

export type Order_Aggregate_Bool_Exp_Bool_And = {
  arguments: Order_Select_Column_Order_Aggregate_Bool_Exp_Bool_And_Arguments_Columns;
  distinct?: boolean | null | undefined;
  filter?: Order_Bool_Exp | null | undefined;
  predicate: Boolean_Comparison_Exp;
};

export type Order_Aggregate_Bool_Exp_Bool_Or = {
  arguments: Order_Select_Column_Order_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns;
  distinct?: boolean | null | undefined;
  filter?: Order_Bool_Exp | null | undefined;
  predicate: Boolean_Comparison_Exp;
};

export type Order_Aggregate_Bool_Exp_Count = {
  arguments?: Array<Order_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: Order_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** order by aggregate values of table "Order" */
export type Order_Aggregate_Order_By = {
  avg?: Order_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Order_Max_Order_By | null | undefined;
  min?: Order_Min_Order_By | null | undefined;
  stddev?: Order_Stddev_Order_By | null | undefined;
  stddev_pop?: Order_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Order_Stddev_Samp_Order_By | null | undefined;
  sum?: Order_Sum_Order_By | null | undefined;
  var_pop?: Order_Var_Pop_Order_By | null | undefined;
  var_samp?: Order_Var_Samp_Order_By | null | undefined;
  variance?: Order_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "Order" */
export type Order_Avg_Order_By = {
  /** For an amended order: the id this order REPLACED (OrderAmended, emitted by the shared OrderBook base — populated for perp and spot). Amendment fires alongside the replacement's OrderPlaced/OrderRested and usually the old order's OrderCancelled, all of which are already handled — so this is attribution only, linking the two rows. */
  amendedFromOrderId?: Order_By | null | undefined;
  /** For an amended order: the id that REPLACED this one. */
  amendedToOrderId?: Order_By | null | undefined;
  expireTimestampNs?: Order_By | null | undefined;
  filledQuantity?: Order_By | null | undefined;
  fullQuantity?: Order_By | null | undefined;
  lastUpdatedAtBlock?: Order_By | null | undefined;
  lastUpdatedAtTimestamp?: Order_By | null | undefined;
  /** Raw uint128 order id: (orderIndex << 64) | uniqueId */
  orderIdRaw?: Order_By | null | undefined;
  placedAtBlock?: Order_By | null | undefined;
  placedAtTimestamp?: Order_By | null | undefined;
  /** Limit price, raw quote units per whole base (BINARY: YES probability) */
  price?: Order_By | null | undefined;
  quantityRemaining?: Order_By | null | undefined;
  /** Opaque market-maker bookkeeping id round-tripped verbatim by the base OrderBook (BinaryPool v2 no longer consumes it for side derivation). NEVER decode this for YES/NO attribution — use `side` (from BinaryPool.BinaryOrderPlaced.kind) instead. 0 on SPOT / PERP. */
  userData?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "Order". All fields are combined with a logical 'AND'. */
export type Order_Bool_Exp = {
  _and?: Array<Order_Bool_Exp> | null | undefined;
  _not?: Order_Bool_Exp | null | undefined;
  _or?: Array<Order_Bool_Exp> | null | undefined;
  amendedFromOrderId?: Numeric_Comparison_Exp | null | undefined;
  amendedToOrderId?: Numeric_Comparison_Exp | null | undefined;
  cancelReason?: String_Comparison_Exp | null | undefined;
  expireTimestampNs?: Numeric_Comparison_Exp | null | undefined;
  filledQuantity?: Numeric_Comparison_Exp | null | undefined;
  fullQuantity?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  isBid?: Boolean_Comparison_Exp | null | undefined;
  lastUpdatedAtBlock?: Numeric_Comparison_Exp | null | undefined;
  lastUpdatedAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  orderId?: String_Comparison_Exp | null | undefined;
  orderIdRaw?: Numeric_Comparison_Exp | null | undefined;
  owner?: String_Comparison_Exp | null | undefined;
  placedAtBlock?: Numeric_Comparison_Exp | null | undefined;
  placedAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  placedTxHash?: String_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  price?: Numeric_Comparison_Exp | null | undefined;
  quantityRemaining?: Numeric_Comparison_Exp | null | undefined;
  rested?: Boolean_Comparison_Exp | null | undefined;
  restingKey?: String_Comparison_Exp | null | undefined;
  side?: Cloborderside_Comparison_Exp | null | undefined;
  status?: Orderstatus_Comparison_Exp | null | undefined;
  userData?: Numeric_Comparison_Exp | null | undefined;
};

/** order by max() on columns of table "Order" */
export type Order_Max_Order_By = {
  /** For an amended order: the id this order REPLACED (OrderAmended, emitted by the shared OrderBook base — populated for perp and spot). Amendment fires alongside the replacement's OrderPlaced/OrderRested and usually the old order's OrderCancelled, all of which are already handled — so this is attribution only, linking the two rows. */
  amendedFromOrderId?: Order_By | null | undefined;
  /** For an amended order: the id that REPLACED this one. */
  amendedToOrderId?: Order_By | null | undefined;
  /**
   * WHY the order was cancelled, when the protocol (not the owner) removed it. Null for
   * an owner cancel and for orders that were never cancelled.
   *
   *   SelfMatch       — same-owner match, the CancelMaker path. Set on every pool type,
   *                     from the OrderCancelledSelfMatch event AND from the pre-upgrade
   *                     reconstruction in src/selfMatch.ts (DEX-1236) — the two are
   *                     deliberately indistinguishable, because on chain they are the
   *                     same removal, only one of them reported itself.
   *   ExceedsPosition — perps guard: filling would push the maker past maxPositionSize
   *   NegativeEquity  — perps guard: the maker's equity would go negative
   *   StaleMark       — perps guard: the mark feed became unreadable, so an OPENING maker was
   *                     pulled rather than filled against a dead reference price. A purely
   *                     reducing maker is unaffected and still fills.
   *   PreFill         — the base pre-fill guard fired with no more specific reason tag
   *
   * Recorded because it is free during this reset and would cost a whole reset later.
   * NegativeEquity is the one that motivated it: that event was never subscribed, so
   * those cancels left the order `Open` in the index forever.
   */
  cancelReason?: Order_By | null | undefined;
  expireTimestampNs?: Order_By | null | undefined;
  filledQuantity?: Order_By | null | undefined;
  fullQuantity?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  lastUpdatedAtBlock?: Order_By | null | undefined;
  lastUpdatedAtTimestamp?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  /** uint128 OrderId as a decimal string (SDK canonical) */
  orderId?: Order_By | null | undefined;
  /** Raw uint128 order id: (orderIndex << 64) | uniqueId */
  orderIdRaw?: Order_By | null | undefined;
  owner?: Order_By | null | undefined;
  placedAtBlock?: Order_By | null | undefined;
  placedAtTimestamp?: Order_By | null | undefined;
  placedTxHash?: Order_By | null | undefined;
  /** Lowercased binary pool address; distinct from the market id when a pool is reused. */
  pool?: Order_By | null | undefined;
  /** Limit price, raw quote units per whole base (BINARY: YES probability) */
  price?: Order_By | null | undefined;
  quantityRemaining?: Order_By | null | undefined;
  /**
   * `${market}_${owner}_{bid|ask}` while this order is RESTING on the book, null the moment
   * it leaves (filled out, cancelled, expired). Indexed so the DEX-1236 self-match
   * reconstruction (src/selfMatch.ts) can load one owner's live ladder on one side instead
   * of scanning the market's whole Open set — the difference between a bounded lookup and an
   * O(open book) scan on every rested placement in the blind window.
   *
   * The two directions are NOT symmetric. An extra key left on a row that already left the
   * book is harmless: the reconstruction re-reads each candidate and drops it on
   * `status`/`rested`, so it costs a wasted row, never a wrong cancel. A MISSING or wrong key
   * on a row that is genuinely resting is not harmless — the key is the reconstruction's only
   * candidate source, so that maker is never considered and its ghost stays Open. Any write
   * path that keeps an order on the book must keep the key with it. Null for everything that
   * never rested (IOC residuals, orders filled at placement).
   */
  restingKey?: Order_By | null | undefined;
  /** BINARY only (null on SPOT). The YES/NO side, mapped from BinaryPool.BinaryOrderPlaced.kind (0=BUY_YES, 1=SELL_YES, 2=BUY_NO, 3=SELL_NO) — the authoritative side-attribution source. NEVER derived from userData. Null until the paired BinaryOrderPlaced arrives (may lag OrderPlaced within a tx; upsert-safe either way). */
  side?: Order_By | null | undefined;
  status?: Order_By | null | undefined;
  /** Opaque market-maker bookkeeping id round-tripped verbatim by the base OrderBook (BinaryPool v2 no longer consumes it for side derivation). NEVER decode this for YES/NO attribution — use `side` (from BinaryPool.BinaryOrderPlaced.kind) instead. 0 on SPOT / PERP. */
  userData?: Order_By | null | undefined;
};

/** order by min() on columns of table "Order" */
export type Order_Min_Order_By = {
  /** For an amended order: the id this order REPLACED (OrderAmended, emitted by the shared OrderBook base — populated for perp and spot). Amendment fires alongside the replacement's OrderPlaced/OrderRested and usually the old order's OrderCancelled, all of which are already handled — so this is attribution only, linking the two rows. */
  amendedFromOrderId?: Order_By | null | undefined;
  /** For an amended order: the id that REPLACED this one. */
  amendedToOrderId?: Order_By | null | undefined;
  /**
   * WHY the order was cancelled, when the protocol (not the owner) removed it. Null for
   * an owner cancel and for orders that were never cancelled.
   *
   *   SelfMatch       — same-owner match, the CancelMaker path. Set on every pool type,
   *                     from the OrderCancelledSelfMatch event AND from the pre-upgrade
   *                     reconstruction in src/selfMatch.ts (DEX-1236) — the two are
   *                     deliberately indistinguishable, because on chain they are the
   *                     same removal, only one of them reported itself.
   *   ExceedsPosition — perps guard: filling would push the maker past maxPositionSize
   *   NegativeEquity  — perps guard: the maker's equity would go negative
   *   StaleMark       — perps guard: the mark feed became unreadable, so an OPENING maker was
   *                     pulled rather than filled against a dead reference price. A purely
   *                     reducing maker is unaffected and still fills.
   *   PreFill         — the base pre-fill guard fired with no more specific reason tag
   *
   * Recorded because it is free during this reset and would cost a whole reset later.
   * NegativeEquity is the one that motivated it: that event was never subscribed, so
   * those cancels left the order `Open` in the index forever.
   */
  cancelReason?: Order_By | null | undefined;
  expireTimestampNs?: Order_By | null | undefined;
  filledQuantity?: Order_By | null | undefined;
  fullQuantity?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  lastUpdatedAtBlock?: Order_By | null | undefined;
  lastUpdatedAtTimestamp?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  /** uint128 OrderId as a decimal string (SDK canonical) */
  orderId?: Order_By | null | undefined;
  /** Raw uint128 order id: (orderIndex << 64) | uniqueId */
  orderIdRaw?: Order_By | null | undefined;
  owner?: Order_By | null | undefined;
  placedAtBlock?: Order_By | null | undefined;
  placedAtTimestamp?: Order_By | null | undefined;
  placedTxHash?: Order_By | null | undefined;
  /** Lowercased binary pool address; distinct from the market id when a pool is reused. */
  pool?: Order_By | null | undefined;
  /** Limit price, raw quote units per whole base (BINARY: YES probability) */
  price?: Order_By | null | undefined;
  quantityRemaining?: Order_By | null | undefined;
  /**
   * `${market}_${owner}_{bid|ask}` while this order is RESTING on the book, null the moment
   * it leaves (filled out, cancelled, expired). Indexed so the DEX-1236 self-match
   * reconstruction (src/selfMatch.ts) can load one owner's live ladder on one side instead
   * of scanning the market's whole Open set — the difference between a bounded lookup and an
   * O(open book) scan on every rested placement in the blind window.
   *
   * The two directions are NOT symmetric. An extra key left on a row that already left the
   * book is harmless: the reconstruction re-reads each candidate and drops it on
   * `status`/`rested`, so it costs a wasted row, never a wrong cancel. A MISSING or wrong key
   * on a row that is genuinely resting is not harmless — the key is the reconstruction's only
   * candidate source, so that maker is never considered and its ghost stays Open. Any write
   * path that keeps an order on the book must keep the key with it. Null for everything that
   * never rested (IOC residuals, orders filled at placement).
   */
  restingKey?: Order_By | null | undefined;
  /** BINARY only (null on SPOT). The YES/NO side, mapped from BinaryPool.BinaryOrderPlaced.kind (0=BUY_YES, 1=SELL_YES, 2=BUY_NO, 3=SELL_NO) — the authoritative side-attribution source. NEVER derived from userData. Null until the paired BinaryOrderPlaced arrives (may lag OrderPlaced within a tx; upsert-safe either way). */
  side?: Order_By | null | undefined;
  status?: Order_By | null | undefined;
  /** Opaque market-maker bookkeeping id round-tripped verbatim by the base OrderBook (BinaryPool v2 no longer consumes it for side derivation). NEVER decode this for YES/NO attribution — use `side` (from BinaryPool.BinaryOrderPlaced.kind) instead. 0 on SPOT / PERP. */
  userData?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "Order". */
export type Order_Order_By = {
  amendedFromOrderId?: Order_By | null | undefined;
  amendedToOrderId?: Order_By | null | undefined;
  cancelReason?: Order_By | null | undefined;
  expireTimestampNs?: Order_By | null | undefined;
  filledQuantity?: Order_By | null | undefined;
  fullQuantity?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  isBid?: Order_By | null | undefined;
  lastUpdatedAtBlock?: Order_By | null | undefined;
  lastUpdatedAtTimestamp?: Order_By | null | undefined;
  market?: Market_Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  orderId?: Order_By | null | undefined;
  orderIdRaw?: Order_By | null | undefined;
  owner?: Order_By | null | undefined;
  placedAtBlock?: Order_By | null | undefined;
  placedAtTimestamp?: Order_By | null | undefined;
  placedTxHash?: Order_By | null | undefined;
  pool?: Order_By | null | undefined;
  price?: Order_By | null | undefined;
  quantityRemaining?: Order_By | null | undefined;
  rested?: Order_By | null | undefined;
  restingKey?: Order_By | null | undefined;
  side?: Order_By | null | undefined;
  status?: Order_By | null | undefined;
  userData?: Order_By | null | undefined;
};

/** select columns of table "Order" */
export type Order_Select_Column =
  /** column name */
  | 'amendedFromOrderId'
  /** column name */
  | 'amendedToOrderId'
  /** column name */
  | 'cancelReason'
  /** column name */
  | 'expireTimestampNs'
  /** column name */
  | 'filledQuantity'
  /** column name */
  | 'fullQuantity'
  /** column name */
  | 'id'
  /** column name */
  | 'isBid'
  /** column name */
  | 'lastUpdatedAtBlock'
  /** column name */
  | 'lastUpdatedAtTimestamp'
  /** column name */
  | 'market_id'
  /** column name */
  | 'orderId'
  /** column name */
  | 'orderIdRaw'
  /** column name */
  | 'owner'
  /** column name */
  | 'placedAtBlock'
  /** column name */
  | 'placedAtTimestamp'
  /** column name */
  | 'placedTxHash'
  /** column name */
  | 'pool'
  /** column name */
  | 'price'
  /** column name */
  | 'quantityRemaining'
  /** column name */
  | 'rested'
  /** column name */
  | 'restingKey'
  /** column name */
  | 'side'
  /** column name */
  | 'status'
  /** column name */
  | 'userData';

/** select "Order_aggregate_bool_exp_bool_and_arguments_columns" columns of table "Order" */
export type Order_Select_Column_Order_Aggregate_Bool_Exp_Bool_And_Arguments_Columns =
  /** column name */
  | 'isBid'
  /** column name */
  | 'rested';

/** select "Order_aggregate_bool_exp_bool_or_arguments_columns" columns of table "Order" */
export type Order_Select_Column_Order_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns =
  /** column name */
  | 'isBid'
  /** column name */
  | 'rested';

/** order by stddev() on columns of table "Order" */
export type Order_Stddev_Order_By = {
  /** For an amended order: the id this order REPLACED (OrderAmended, emitted by the shared OrderBook base — populated for perp and spot). Amendment fires alongside the replacement's OrderPlaced/OrderRested and usually the old order's OrderCancelled, all of which are already handled — so this is attribution only, linking the two rows. */
  amendedFromOrderId?: Order_By | null | undefined;
  /** For an amended order: the id that REPLACED this one. */
  amendedToOrderId?: Order_By | null | undefined;
  expireTimestampNs?: Order_By | null | undefined;
  filledQuantity?: Order_By | null | undefined;
  fullQuantity?: Order_By | null | undefined;
  lastUpdatedAtBlock?: Order_By | null | undefined;
  lastUpdatedAtTimestamp?: Order_By | null | undefined;
  /** Raw uint128 order id: (orderIndex << 64) | uniqueId */
  orderIdRaw?: Order_By | null | undefined;
  placedAtBlock?: Order_By | null | undefined;
  placedAtTimestamp?: Order_By | null | undefined;
  /** Limit price, raw quote units per whole base (BINARY: YES probability) */
  price?: Order_By | null | undefined;
  quantityRemaining?: Order_By | null | undefined;
  /** Opaque market-maker bookkeeping id round-tripped verbatim by the base OrderBook (BinaryPool v2 no longer consumes it for side derivation). NEVER decode this for YES/NO attribution — use `side` (from BinaryPool.BinaryOrderPlaced.kind) instead. 0 on SPOT / PERP. */
  userData?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "Order" */
export type Order_Stddev_Pop_Order_By = {
  /** For an amended order: the id this order REPLACED (OrderAmended, emitted by the shared OrderBook base — populated for perp and spot). Amendment fires alongside the replacement's OrderPlaced/OrderRested and usually the old order's OrderCancelled, all of which are already handled — so this is attribution only, linking the two rows. */
  amendedFromOrderId?: Order_By | null | undefined;
  /** For an amended order: the id that REPLACED this one. */
  amendedToOrderId?: Order_By | null | undefined;
  expireTimestampNs?: Order_By | null | undefined;
  filledQuantity?: Order_By | null | undefined;
  fullQuantity?: Order_By | null | undefined;
  lastUpdatedAtBlock?: Order_By | null | undefined;
  lastUpdatedAtTimestamp?: Order_By | null | undefined;
  /** Raw uint128 order id: (orderIndex << 64) | uniqueId */
  orderIdRaw?: Order_By | null | undefined;
  placedAtBlock?: Order_By | null | undefined;
  placedAtTimestamp?: Order_By | null | undefined;
  /** Limit price, raw quote units per whole base (BINARY: YES probability) */
  price?: Order_By | null | undefined;
  quantityRemaining?: Order_By | null | undefined;
  /** Opaque market-maker bookkeeping id round-tripped verbatim by the base OrderBook (BinaryPool v2 no longer consumes it for side derivation). NEVER decode this for YES/NO attribution — use `side` (from BinaryPool.BinaryOrderPlaced.kind) instead. 0 on SPOT / PERP. */
  userData?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "Order" */
export type Order_Stddev_Samp_Order_By = {
  /** For an amended order: the id this order REPLACED (OrderAmended, emitted by the shared OrderBook base — populated for perp and spot). Amendment fires alongside the replacement's OrderPlaced/OrderRested and usually the old order's OrderCancelled, all of which are already handled — so this is attribution only, linking the two rows. */
  amendedFromOrderId?: Order_By | null | undefined;
  /** For an amended order: the id that REPLACED this one. */
  amendedToOrderId?: Order_By | null | undefined;
  expireTimestampNs?: Order_By | null | undefined;
  filledQuantity?: Order_By | null | undefined;
  fullQuantity?: Order_By | null | undefined;
  lastUpdatedAtBlock?: Order_By | null | undefined;
  lastUpdatedAtTimestamp?: Order_By | null | undefined;
  /** Raw uint128 order id: (orderIndex << 64) | uniqueId */
  orderIdRaw?: Order_By | null | undefined;
  placedAtBlock?: Order_By | null | undefined;
  placedAtTimestamp?: Order_By | null | undefined;
  /** Limit price, raw quote units per whole base (BINARY: YES probability) */
  price?: Order_By | null | undefined;
  quantityRemaining?: Order_By | null | undefined;
  /** Opaque market-maker bookkeeping id round-tripped verbatim by the base OrderBook (BinaryPool v2 no longer consumes it for side derivation). NEVER decode this for YES/NO attribution — use `side` (from BinaryPool.BinaryOrderPlaced.kind) instead. 0 on SPOT / PERP. */
  userData?: Order_By | null | undefined;
};

/** order by sum() on columns of table "Order" */
export type Order_Sum_Order_By = {
  /** For an amended order: the id this order REPLACED (OrderAmended, emitted by the shared OrderBook base — populated for perp and spot). Amendment fires alongside the replacement's OrderPlaced/OrderRested and usually the old order's OrderCancelled, all of which are already handled — so this is attribution only, linking the two rows. */
  amendedFromOrderId?: Order_By | null | undefined;
  /** For an amended order: the id that REPLACED this one. */
  amendedToOrderId?: Order_By | null | undefined;
  expireTimestampNs?: Order_By | null | undefined;
  filledQuantity?: Order_By | null | undefined;
  fullQuantity?: Order_By | null | undefined;
  lastUpdatedAtBlock?: Order_By | null | undefined;
  lastUpdatedAtTimestamp?: Order_By | null | undefined;
  /** Raw uint128 order id: (orderIndex << 64) | uniqueId */
  orderIdRaw?: Order_By | null | undefined;
  placedAtBlock?: Order_By | null | undefined;
  placedAtTimestamp?: Order_By | null | undefined;
  /** Limit price, raw quote units per whole base (BINARY: YES probability) */
  price?: Order_By | null | undefined;
  quantityRemaining?: Order_By | null | undefined;
  /** Opaque market-maker bookkeeping id round-tripped verbatim by the base OrderBook (BinaryPool v2 no longer consumes it for side derivation). NEVER decode this for YES/NO attribution — use `side` (from BinaryPool.BinaryOrderPlaced.kind) instead. 0 on SPOT / PERP. */
  userData?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "Order" */
export type Order_Var_Pop_Order_By = {
  /** For an amended order: the id this order REPLACED (OrderAmended, emitted by the shared OrderBook base — populated for perp and spot). Amendment fires alongside the replacement's OrderPlaced/OrderRested and usually the old order's OrderCancelled, all of which are already handled — so this is attribution only, linking the two rows. */
  amendedFromOrderId?: Order_By | null | undefined;
  /** For an amended order: the id that REPLACED this one. */
  amendedToOrderId?: Order_By | null | undefined;
  expireTimestampNs?: Order_By | null | undefined;
  filledQuantity?: Order_By | null | undefined;
  fullQuantity?: Order_By | null | undefined;
  lastUpdatedAtBlock?: Order_By | null | undefined;
  lastUpdatedAtTimestamp?: Order_By | null | undefined;
  /** Raw uint128 order id: (orderIndex << 64) | uniqueId */
  orderIdRaw?: Order_By | null | undefined;
  placedAtBlock?: Order_By | null | undefined;
  placedAtTimestamp?: Order_By | null | undefined;
  /** Limit price, raw quote units per whole base (BINARY: YES probability) */
  price?: Order_By | null | undefined;
  quantityRemaining?: Order_By | null | undefined;
  /** Opaque market-maker bookkeeping id round-tripped verbatim by the base OrderBook (BinaryPool v2 no longer consumes it for side derivation). NEVER decode this for YES/NO attribution — use `side` (from BinaryPool.BinaryOrderPlaced.kind) instead. 0 on SPOT / PERP. */
  userData?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "Order" */
export type Order_Var_Samp_Order_By = {
  /** For an amended order: the id this order REPLACED (OrderAmended, emitted by the shared OrderBook base — populated for perp and spot). Amendment fires alongside the replacement's OrderPlaced/OrderRested and usually the old order's OrderCancelled, all of which are already handled — so this is attribution only, linking the two rows. */
  amendedFromOrderId?: Order_By | null | undefined;
  /** For an amended order: the id that REPLACED this one. */
  amendedToOrderId?: Order_By | null | undefined;
  expireTimestampNs?: Order_By | null | undefined;
  filledQuantity?: Order_By | null | undefined;
  fullQuantity?: Order_By | null | undefined;
  lastUpdatedAtBlock?: Order_By | null | undefined;
  lastUpdatedAtTimestamp?: Order_By | null | undefined;
  /** Raw uint128 order id: (orderIndex << 64) | uniqueId */
  orderIdRaw?: Order_By | null | undefined;
  placedAtBlock?: Order_By | null | undefined;
  placedAtTimestamp?: Order_By | null | undefined;
  /** Limit price, raw quote units per whole base (BINARY: YES probability) */
  price?: Order_By | null | undefined;
  quantityRemaining?: Order_By | null | undefined;
  /** Opaque market-maker bookkeeping id round-tripped verbatim by the base OrderBook (BinaryPool v2 no longer consumes it for side derivation). NEVER decode this for YES/NO attribution — use `side` (from BinaryPool.BinaryOrderPlaced.kind) instead. 0 on SPOT / PERP. */
  userData?: Order_By | null | undefined;
};

/** order by variance() on columns of table "Order" */
export type Order_Variance_Order_By = {
  /** For an amended order: the id this order REPLACED (OrderAmended, emitted by the shared OrderBook base — populated for perp and spot). Amendment fires alongside the replacement's OrderPlaced/OrderRested and usually the old order's OrderCancelled, all of which are already handled — so this is attribution only, linking the two rows. */
  amendedFromOrderId?: Order_By | null | undefined;
  /** For an amended order: the id that REPLACED this one. */
  amendedToOrderId?: Order_By | null | undefined;
  expireTimestampNs?: Order_By | null | undefined;
  filledQuantity?: Order_By | null | undefined;
  fullQuantity?: Order_By | null | undefined;
  lastUpdatedAtBlock?: Order_By | null | undefined;
  lastUpdatedAtTimestamp?: Order_By | null | undefined;
  /** Raw uint128 order id: (orderIndex << 64) | uniqueId */
  orderIdRaw?: Order_By | null | undefined;
  placedAtBlock?: Order_By | null | undefined;
  placedAtTimestamp?: Order_By | null | undefined;
  /** Limit price, raw quote units per whole base (BINARY: YES probability) */
  price?: Order_By | null | undefined;
  quantityRemaining?: Order_By | null | undefined;
  /** Opaque market-maker bookkeeping id round-tripped verbatim by the base OrderBook (BinaryPool v2 no longer consumes it for side derivation). NEVER decode this for YES/NO attribution — use `side` (from BinaryPool.BinaryOrderPlaced.kind) instead. 0 on SPOT / PERP. */
  userData?: Order_By | null | undefined;
};

export type OutcomeBalance_Aggregate_Bool_Exp = {
  count?: OutcomeBalance_Aggregate_Bool_Exp_Count | null | undefined;
};

export type OutcomeBalance_Aggregate_Bool_Exp_Count = {
  arguments?: Array<OutcomeBalance_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: OutcomeBalance_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** order by aggregate values of table "OutcomeBalance" */
export type OutcomeBalance_Aggregate_Order_By = {
  avg?: OutcomeBalance_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: OutcomeBalance_Max_Order_By | null | undefined;
  min?: OutcomeBalance_Min_Order_By | null | undefined;
  stddev?: OutcomeBalance_Stddev_Order_By | null | undefined;
  stddev_pop?: OutcomeBalance_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: OutcomeBalance_Stddev_Samp_Order_By | null | undefined;
  sum?: OutcomeBalance_Sum_Order_By | null | undefined;
  var_pop?: OutcomeBalance_Var_Pop_Order_By | null | undefined;
  var_samp?: OutcomeBalance_Var_Samp_Order_By | null | undefined;
  variance?: OutcomeBalance_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "OutcomeBalance" */
export type OutcomeBalance_Avg_Order_By = {
  balance?: Order_By | null | undefined;
  /** 0 = YES, 1 = NO */
  outcomeIndex?: Order_By | null | undefined;
  /** Last block that changed this row or its market's published status (SMK-542 row version). */
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "OutcomeBalance". All fields are combined with a logical 'AND'. */
export type OutcomeBalance_Bool_Exp = {
  _and?: Array<OutcomeBalance_Bool_Exp> | null | undefined;
  _not?: OutcomeBalance_Bool_Exp | null | undefined;
  _or?: Array<OutcomeBalance_Bool_Exp> | null | undefined;
  account?: String_Comparison_Exp | null | undefined;
  balance?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  outcomeIndex?: Int_Comparison_Exp | null | undefined;
  tokenId?: String_Comparison_Exp | null | undefined;
  updatedAtBlock?: Int_Comparison_Exp | null | undefined;
  updatedAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
};

/** order by max() on columns of table "OutcomeBalance" */
export type OutcomeBalance_Max_Order_By = {
  account?: Order_By | null | undefined;
  balance?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  /** 0 = YES, 1 = NO */
  outcomeIndex?: Order_By | null | undefined;
  /** ERC-6909 id (decimal string) on the shared outcome-token singleton. */
  tokenId?: Order_By | null | undefined;
  /** Last block that changed this row or its market's published status (SMK-542 row version). */
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by min() on columns of table "OutcomeBalance" */
export type OutcomeBalance_Min_Order_By = {
  account?: Order_By | null | undefined;
  balance?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  /** 0 = YES, 1 = NO */
  outcomeIndex?: Order_By | null | undefined;
  /** ERC-6909 id (decimal string) on the shared outcome-token singleton. */
  tokenId?: Order_By | null | undefined;
  /** Last block that changed this row or its market's published status (SMK-542 row version). */
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** select columns of table "OutcomeBalance" */
export type OutcomeBalance_Select_Column =
  /** column name */
  | 'account'
  /** column name */
  | 'balance'
  /** column name */
  | 'id'
  /** column name */
  | 'market_id'
  /** column name */
  | 'outcomeIndex'
  /** column name */
  | 'tokenId'
  /** column name */
  | 'updatedAtBlock'
  /** column name */
  | 'updatedAtTimestamp';

/** order by stddev() on columns of table "OutcomeBalance" */
export type OutcomeBalance_Stddev_Order_By = {
  balance?: Order_By | null | undefined;
  /** 0 = YES, 1 = NO */
  outcomeIndex?: Order_By | null | undefined;
  /** Last block that changed this row or its market's published status (SMK-542 row version). */
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "OutcomeBalance" */
export type OutcomeBalance_Stddev_Pop_Order_By = {
  balance?: Order_By | null | undefined;
  /** 0 = YES, 1 = NO */
  outcomeIndex?: Order_By | null | undefined;
  /** Last block that changed this row or its market's published status (SMK-542 row version). */
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "OutcomeBalance" */
export type OutcomeBalance_Stddev_Samp_Order_By = {
  balance?: Order_By | null | undefined;
  /** 0 = YES, 1 = NO */
  outcomeIndex?: Order_By | null | undefined;
  /** Last block that changed this row or its market's published status (SMK-542 row version). */
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by sum() on columns of table "OutcomeBalance" */
export type OutcomeBalance_Sum_Order_By = {
  balance?: Order_By | null | undefined;
  /** 0 = YES, 1 = NO */
  outcomeIndex?: Order_By | null | undefined;
  /** Last block that changed this row or its market's published status (SMK-542 row version). */
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "OutcomeBalance" */
export type OutcomeBalance_Var_Pop_Order_By = {
  balance?: Order_By | null | undefined;
  /** 0 = YES, 1 = NO */
  outcomeIndex?: Order_By | null | undefined;
  /** Last block that changed this row or its market's published status (SMK-542 row version). */
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "OutcomeBalance" */
export type OutcomeBalance_Var_Samp_Order_By = {
  balance?: Order_By | null | undefined;
  /** 0 = YES, 1 = NO */
  outcomeIndex?: Order_By | null | undefined;
  /** Last block that changed this row or its market's published status (SMK-542 row version). */
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by variance() on columns of table "OutcomeBalance" */
export type OutcomeBalance_Variance_Order_By = {
  balance?: Order_By | null | undefined;
  /** 0 = YES, 1 = NO */
  outcomeIndex?: Order_By | null | undefined;
  /** Last block that changed this row or its market's published status (SMK-542 row version). */
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "PerpFeeRecord". All fields are combined with a logical 'AND'. */
export type PerpFeeRecord_Bool_Exp = {
  _and?: Array<PerpFeeRecord_Bool_Exp> | null | undefined;
  _not?: PerpFeeRecord_Bool_Exp | null | undefined;
  _or?: Array<PerpFeeRecord_Bool_Exp> | null | undefined;
  account?: String_Comparison_Exp | null | undefined;
  amount?: Numeric_Comparison_Exp | null | undefined;
  builder?: String_Comparison_Exp | null | undefined;
  fillNotional?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  insurancePortion?: Numeric_Comparison_Exp | null | undefined;
  isRebate?: Boolean_Comparison_Exp | null | undefined;
  kind?: String_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  requestedAmount?: Numeric_Comparison_Exp | null | undefined;
  skipReason?: Int_Comparison_Exp | null | undefined;
  tier?: Numeric_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "PerpInsuranceFundEvent". All fields are combined with a logical 'AND'. */
export type PerpInsuranceFundEvent_Bool_Exp = {
  _and?: Array<PerpInsuranceFundEvent_Bool_Exp> | null | undefined;
  _not?: PerpInsuranceFundEvent_Bool_Exp | null | undefined;
  _or?: Array<PerpInsuranceFundEvent_Bool_Exp> | null | undefined;
  account?: String_Comparison_Exp | null | undefined;
  amount?: Numeric_Comparison_Exp | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  caller?: String_Comparison_Exp | null | undefined;
  counterparty?: String_Comparison_Exp | null | undefined;
  covered?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  kind?: String_Comparison_Exp | null | undefined;
  logIndex?: Int_Comparison_Exp | null | undefined;
  requested?: Numeric_Comparison_Exp | null | undefined;
  tier?: Numeric_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  toTier?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "PerpMainFundingEvent". All fields are combined with a logical 'AND'. */
export type PerpMainFundingEvent_Bool_Exp = {
  _and?: Array<PerpMainFundingEvent_Bool_Exp> | null | undefined;
  _not?: PerpMainFundingEvent_Bool_Exp | null | undefined;
  _or?: Array<PerpMainFundingEvent_Bool_Exp> | null | undefined;
  account?: String_Comparison_Exp | null | undefined;
  amount?: Numeric_Comparison_Exp | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  kind?: String_Comparison_Exp | null | undefined;
  outstandingPrincipal?: Numeric_Comparison_Exp | null | undefined;
  payer?: String_Comparison_Exp | null | undefined;
  previousPrincipal?: Numeric_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "PerpMarginPull". All fields are combined with a logical 'AND'. */
export type PerpMarginPull_Bool_Exp = {
  _and?: Array<PerpMarginPull_Bool_Exp> | null | undefined;
  _not?: PerpMarginPull_Bool_Exp | null | undefined;
  _or?: Array<PerpMarginPull_Bool_Exp> | null | undefined;
  account?: String_Comparison_Exp | null | undefined;
  amount?: Numeric_Comparison_Exp | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  orderId?: String_Comparison_Exp | null | undefined;
  payer?: String_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  source?: String_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "PerpOrderRejection". All fields are combined with a logical 'AND'. */
export type PerpOrderRejection_Bool_Exp = {
  _and?: Array<PerpOrderRejection_Bool_Exp> | null | undefined;
  _not?: PerpOrderRejection_Bool_Exp | null | undefined;
  _or?: Array<PerpOrderRejection_Bool_Exp> | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  isAmend?: Boolean_Comparison_Exp | null | undefined;
  oldOrderId?: String_Comparison_Exp | null | undefined;
  owner?: String_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  reason?: Int_Comparison_Exp | null | undefined;
  requestIndex?: Numeric_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "PerpPositionChange". All fields are combined with a logical 'AND'. */
export type PerpPositionChange_Bool_Exp = {
  _and?: Array<PerpPositionChange_Bool_Exp> | null | undefined;
  _not?: PerpPositionChange_Bool_Exp | null | undefined;
  _or?: Array<PerpPositionChange_Bool_Exp> | null | undefined;
  account?: String_Comparison_Exp | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  closedSize?: Numeric_Comparison_Exp | null | undefined;
  entryPriceAfter?: Numeric_Comparison_Exp | null | undefined;
  entryPriceBefore?: Numeric_Comparison_Exp | null | undefined;
  exitPrice?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  kind?: Perppositionchangekind_Comparison_Exp | null | undefined;
  logIndex?: Int_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  orderId?: Numeric_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  realizedPnl?: Numeric_Comparison_Exp | null | undefined;
  sizeAfter?: Numeric_Comparison_Exp | null | undefined;
  sizeBefore?: Numeric_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Ordering options when selecting data from "PerpPositionChange". */
export type PerpPositionChange_Order_By = {
  account?: Order_By | null | undefined;
  blockNumber?: Order_By | null | undefined;
  closedSize?: Order_By | null | undefined;
  entryPriceAfter?: Order_By | null | undefined;
  entryPriceBefore?: Order_By | null | undefined;
  exitPrice?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  kind?: Order_By | null | undefined;
  logIndex?: Order_By | null | undefined;
  market?: Market_Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  orderId?: Order_By | null | undefined;
  pool?: Order_By | null | undefined;
  realizedPnl?: Order_By | null | undefined;
  sizeAfter?: Order_By | null | undefined;
  sizeBefore?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
  txHash?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "PerpPosition". All fields are combined with a logical 'AND'. */
export type PerpPosition_Bool_Exp = {
  _and?: Array<PerpPosition_Bool_Exp> | null | undefined;
  _not?: PerpPosition_Bool_Exp | null | undefined;
  _or?: Array<PerpPosition_Bool_Exp> | null | undefined;
  account?: String_Comparison_Exp | null | undefined;
  entryFundingIndex?: Numeric_Comparison_Exp | null | undefined;
  entryPriceX18?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  isLong?: Boolean_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  realizedPnl?: Numeric_Comparison_Exp | null | undefined;
  size?: Numeric_Comparison_Exp | null | undefined;
  updatedAt?: Numeric_Comparison_Exp | null | undefined;
  updatedAtBlock?: Int_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "PerpWalletLinkEvent". All fields are combined with a logical 'AND'. */
export type PerpWalletLinkEvent_Bool_Exp = {
  _and?: Array<PerpWalletLinkEvent_Bool_Exp> | null | undefined;
  _not?: PerpWalletLinkEvent_Bool_Exp | null | undefined;
  _or?: Array<PerpWalletLinkEvent_Bool_Exp> | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  child?: String_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  kind?: String_Comparison_Exp | null | undefined;
  logIndex?: Int_Comparison_Exp | null | undefined;
  main?: String_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "ProtocolFeeRecord". All fields are combined with a logical 'AND'. */
export type ProtocolFeeRecord_Bool_Exp = {
  _and?: Array<ProtocolFeeRecord_Bool_Exp> | null | undefined;
  _not?: ProtocolFeeRecord_Bool_Exp | null | undefined;
  _or?: Array<ProtocolFeeRecord_Bool_Exp> | null | undefined;
  amount?: Numeric_Comparison_Exp | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  isTakerSide?: Boolean_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  orderId?: String_Comparison_Exp | null | undefined;
  payer?: String_Comparison_Exp | null | undefined;
  pool?: String_Comparison_Exp | null | undefined;
  recipient?: String_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  token?: String_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Boolean expression to filter rows from the table "RouterActionRecord". All fields are combined with a logical 'AND'. */
export type RouterActionRecord_Bool_Exp = {
  _and?: Array<RouterActionRecord_Bool_Exp> | null | undefined;
  _not?: RouterActionRecord_Bool_Exp | null | undefined;
  _or?: Array<RouterActionRecord_Bool_Exp> | null | undefined;
  account?: String_Comparison_Exp | null | undefined;
  amount?: Numeric_Comparison_Exp | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  kind?: String_Comparison_Exp | null | undefined;
  logIndex?: Int_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  operatorId?: Int_Comparison_Exp | null | undefined;
  payout?: Numeric_Comparison_Exp | null | undefined;
  routedVia?: String_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
  venueId?: String_Comparison_Exp | null | undefined;
};

export type Series_Aggregate_Bool_Exp = {
  count?: Series_Aggregate_Bool_Exp_Count | null | undefined;
};

export type Series_Aggregate_Bool_Exp_Count = {
  arguments?: Array<Series_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: Series_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** order by aggregate values of table "Series" */
export type Series_Aggregate_Order_By = {
  avg?: Series_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: Series_Max_Order_By | null | undefined;
  min?: Series_Min_Order_By | null | undefined;
  stddev?: Series_Stddev_Order_By | null | undefined;
  stddev_pop?: Series_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: Series_Stddev_Samp_Order_By | null | undefined;
  sum?: Series_Sum_Order_By | null | undefined;
  var_pop?: Series_Var_Pop_Order_By | null | undefined;
  var_samp?: Series_Var_Samp_Order_By | null | undefined;
  variance?: Series_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "Series" */
export type Series_Avg_Order_By = {
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  /** The series period in seconds. */
  intervalSec?: Order_By | null | undefined;
  seriesId?: Order_By | null | undefined;
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "Series". All fields are combined with a logical 'AND'. */
export type Series_Bool_Exp = {
  _and?: Array<Series_Bool_Exp> | null | undefined;
  _not?: Series_Bool_Exp | null | undefined;
  _or?: Array<Series_Bool_Exp> | null | undefined;
  asset?: String_Comparison_Exp | null | undefined;
  collateral?: String_Comparison_Exp | null | undefined;
  createdAtBlock?: Int_Comparison_Exp | null | undefined;
  createdAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  creator?: MarketCreator_Bool_Exp | null | undefined;
  creatorAddress?: String_Comparison_Exp | null | undefined;
  creator_id?: String_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  intervalSec?: Numeric_Comparison_Exp | null | undefined;
  seriesId?: Int_Comparison_Exp | null | undefined;
  updatedAtBlock?: Int_Comparison_Exp | null | undefined;
  updatedAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
};

/** order by max() on columns of table "Series" */
export type Series_Max_Order_By = {
  /** Token symbol the series tracks (e.g. "BTC"). */
  asset?: Order_By | null | undefined;
  /** Collateral token the series' markets are denominated in (lowercased). */
  collateral?: Order_By | null | undefined;
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  /** Lowercased creator address (denormalized for filtering). */
  creatorAddress?: Order_By | null | undefined;
  creator_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  /** The series period in seconds. */
  intervalSec?: Order_By | null | undefined;
  seriesId?: Order_By | null | undefined;
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by min() on columns of table "Series" */
export type Series_Min_Order_By = {
  /** Token symbol the series tracks (e.g. "BTC"). */
  asset?: Order_By | null | undefined;
  /** Collateral token the series' markets are denominated in (lowercased). */
  collateral?: Order_By | null | undefined;
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  /** Lowercased creator address (denormalized for filtering). */
  creatorAddress?: Order_By | null | undefined;
  creator_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  /** The series period in seconds. */
  intervalSec?: Order_By | null | undefined;
  seriesId?: Order_By | null | undefined;
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** Ordering options when selecting data from "Series". */
export type Series_Order_By = {
  asset?: Order_By | null | undefined;
  collateral?: Order_By | null | undefined;
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  creator?: MarketCreator_Order_By | null | undefined;
  creatorAddress?: Order_By | null | undefined;
  creator_id?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  intervalSec?: Order_By | null | undefined;
  seriesId?: Order_By | null | undefined;
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** select columns of table "Series" */
export type Series_Select_Column =
  /** column name */
  | 'asset'
  /** column name */
  | 'collateral'
  /** column name */
  | 'createdAtBlock'
  /** column name */
  | 'createdAtTimestamp'
  /** column name */
  | 'creatorAddress'
  /** column name */
  | 'creator_id'
  /** column name */
  | 'id'
  /** column name */
  | 'intervalSec'
  /** column name */
  | 'seriesId'
  /** column name */
  | 'updatedAtBlock'
  /** column name */
  | 'updatedAtTimestamp';

/** order by stddev() on columns of table "Series" */
export type Series_Stddev_Order_By = {
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  /** The series period in seconds. */
  intervalSec?: Order_By | null | undefined;
  seriesId?: Order_By | null | undefined;
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "Series" */
export type Series_Stddev_Pop_Order_By = {
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  /** The series period in seconds. */
  intervalSec?: Order_By | null | undefined;
  seriesId?: Order_By | null | undefined;
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "Series" */
export type Series_Stddev_Samp_Order_By = {
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  /** The series period in seconds. */
  intervalSec?: Order_By | null | undefined;
  seriesId?: Order_By | null | undefined;
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by sum() on columns of table "Series" */
export type Series_Sum_Order_By = {
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  /** The series period in seconds. */
  intervalSec?: Order_By | null | undefined;
  seriesId?: Order_By | null | undefined;
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "Series" */
export type Series_Var_Pop_Order_By = {
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  /** The series period in seconds. */
  intervalSec?: Order_By | null | undefined;
  seriesId?: Order_By | null | undefined;
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "Series" */
export type Series_Var_Samp_Order_By = {
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  /** The series period in seconds. */
  intervalSec?: Order_By | null | undefined;
  seriesId?: Order_By | null | undefined;
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** order by variance() on columns of table "Series" */
export type Series_Variance_Order_By = {
  createdAtBlock?: Order_By | null | undefined;
  createdAtTimestamp?: Order_By | null | undefined;
  /** The series period in seconds. */
  intervalSec?: Order_By | null | undefined;
  seriesId?: Order_By | null | undefined;
  updatedAtBlock?: Order_By | null | undefined;
  updatedAtTimestamp?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "SettlementFeeRecord". All fields are combined with a logical 'AND'. */
export type SettlementFeeRecord_Bool_Exp = {
  _and?: Array<SettlementFeeRecord_Bool_Exp> | null | undefined;
  _not?: SettlementFeeRecord_Bool_Exp | null | undefined;
  _or?: Array<SettlementFeeRecord_Bool_Exp> | null | undefined;
  blockNumber?: Numeric_Comparison_Exp | null | undefined;
  fee?: Numeric_Comparison_Exp | null | undefined;
  feeRecipient?: String_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
  winningBacking?: Numeric_Comparison_Exp | null | undefined;
};

export type StopOrder_Aggregate_Bool_Exp = {
  bool_and?: StopOrder_Aggregate_Bool_Exp_Bool_And | null | undefined;
  bool_or?: StopOrder_Aggregate_Bool_Exp_Bool_Or | null | undefined;
  count?: StopOrder_Aggregate_Bool_Exp_Count | null | undefined;
};

export type StopOrder_Aggregate_Bool_Exp_Bool_And = {
  arguments: StopOrder_Select_Column_StopOrder_Aggregate_Bool_Exp_Bool_And_Arguments_Columns;
  distinct?: boolean | null | undefined;
  filter?: StopOrder_Bool_Exp | null | undefined;
  predicate: Boolean_Comparison_Exp;
};

export type StopOrder_Aggregate_Bool_Exp_Bool_Or = {
  arguments: StopOrder_Select_Column_StopOrder_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns;
  distinct?: boolean | null | undefined;
  filter?: StopOrder_Bool_Exp | null | undefined;
  predicate: Boolean_Comparison_Exp;
};

export type StopOrder_Aggregate_Bool_Exp_Count = {
  arguments?: Array<StopOrder_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: StopOrder_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** order by aggregate values of table "StopOrder" */
export type StopOrder_Aggregate_Order_By = {
  avg?: StopOrder_Avg_Order_By | null | undefined;
  count?: Order_By | null | undefined;
  max?: StopOrder_Max_Order_By | null | undefined;
  min?: StopOrder_Min_Order_By | null | undefined;
  stddev?: StopOrder_Stddev_Order_By | null | undefined;
  stddev_pop?: StopOrder_Stddev_Pop_Order_By | null | undefined;
  stddev_samp?: StopOrder_Stddev_Samp_Order_By | null | undefined;
  sum?: StopOrder_Sum_Order_By | null | undefined;
  var_pop?: StopOrder_Var_Pop_Order_By | null | undefined;
  var_samp?: StopOrder_Var_Samp_Order_By | null | undefined;
  variance?: StopOrder_Variance_Order_By | null | undefined;
};

/** order by avg() on columns of table "StopOrder" */
export type StopOrder_Avg_Order_By = {
  /**
   * PERP only — the builder fee the triggered IOC will charge, in bps x 1000 (so 1500 =
   * 1.5bps). Zero on a spot stop, whose registry event carries no such field.
   *
   * Indexed because this is the only chance to capture it. The registry deletes a pending
   * order on every fire, so once triggered nothing on chain can answer what fee was
   * agreed, and `PendingOrderCreated` is the sole record — a column added later would be
   * null for every order that has already fired, and populating it would need another
   * full reindex.
   */
  builderFeeBpsTimes1k?: Order_By | null | undefined;
  createdAt?: Order_By | null | undefined;
  /**
   * PERP only — WHY a trigger placed nothing, when `status` is TRIGGER_FAILED.
   *
   *   0 None                    (unused here; a successful trigger records null)
   *   1 ReduceOnlyNoPosition    fired with no position left to reduce
   *   2 ReduceOnlyWrongSide     the position flipped before it fired
   *   3 ReduceOnlyBelowMinQty   what remained was below the pool's minimum
   *   4 PlacementFailed         the pool rejected the order outright
   *   5 NoFill                  the pool ACCEPTED the order and it traded nothing
   *
   * Null on spot, and null on success. The distinction is load-bearing for a UI: 1-3 and
   * 5 are ordinary outcomes of a stop that was overtaken by events or by a thin book,
   * while 4 is a real rejection — collapsing them to "failed" makes routine behaviour look
   * broken. SOMI is consumed on every fire regardless.
   *
   * 5 was APPENDED by the registry; every earlier value keeps its number, so rows indexed
   * before it are unaffected. It exists because an accepted placement is not an executed
   * one: the pool decides an IOC's fate on a dry run, and the real run can fill less —
   * including nothing — when it pulls a maker the dry run had counted. That outcome
   * previously arrived as `success = true`, which reported a stop that protected nothing
   * as having worked.
   */
  dropReason?: Order_By | null | undefined;
  /**
   * PERP only — whether the triggered order may only REDUCE the owner's position, or may
   * open and increase one.
   *
   *   0 ReduceOnly   a take-profit / stop-loss (the default, and every pre-upgrade order)
   *   1 Opening      a stop-entry / breakout, gated on initial margin at creation
   *
   * Zero means ReduceOnly deliberately: the registry appended this field, so every order
   * created before it reads back as zero and MUST keep its original meaning. Null on spot,
   * whose registry has no such concept.
   */
  intent?: Order_By | null | undefined;
  orderIdRaw?: Order_By | null | undefined;
  /** 0 = LIMIT, 1 = MARKET */
  orderType?: Order_By | null | undefined;
  /**
   * Pool order id created on a successful trigger — a SpotPool order for a SPOT market,
   * a PerpPool order for a PERP one. Null until triggered, and null on a trigger that
   * fired but placed nothing (see dropReason). Renamed from `spotOrderId` when perps
   * joined this entity: one registry shape serves both, and a spot-only name on a shared
   * column reads as "perps do not trigger", which is the opposite of true.
   */
  placedOrderId?: Order_By | null | undefined;
  quantity?: Order_By | null | undefined;
  /**
   * PERP only — the LIVE link to this stop's OCO sibling, when this stop is one leg of a
   * take-profit / stop-loss pair. Null when unlinked, and null on every spot stop.
   *
   * A pair is one trader intent expressed as two orders: when one leg triggers AND FILLS
   * the registry cancels the other and refunds its SOMI. Without this column a client
   * shows two unrelated stops and cannot say that cancelling one leaves the other armed.
   *
   * Mutable, unlike most of this row. A leg that fires WITHOUT filling leaves its partner
   * live and UNLINKED (back to null), which is what lets the survivor be re-paired.
   *
   * LIVE is the whole contract, and it is why every TERMINAL write clears this. A pair's
   * two rows leave at different times, so a surviving pointer on a departed row names an
   * order whose own state has moved on: the trader cancels leg A, the chain unlinks B, and
   * a row A still pointing at B invites a client acting on "cancel the pair" to tear down
   * a stop the trader deliberately kept armed. Provenance — which leg retired which —
   * deliberately does NOT live here; `cancelReason` carries the cause instead.
   */
  siblingOrderId?: Order_By | null | undefined;
  /** 0 = GTE, 1 = LTE (mark price vs trigger price) */
  triggerOperator?: Order_By | null | undefined;
  triggerPrice?: Order_By | null | undefined;
  updatedAt?: Order_By | null | undefined;
};

/** Boolean expression to filter rows from the table "StopOrder". All fields are combined with a logical 'AND'. */
export type StopOrder_Bool_Exp = {
  _and?: Array<StopOrder_Bool_Exp> | null | undefined;
  _not?: StopOrder_Bool_Exp | null | undefined;
  _or?: Array<StopOrder_Bool_Exp> | null | undefined;
  builder?: String_Comparison_Exp | null | undefined;
  builderFeeBpsTimes1k?: Numeric_Comparison_Exp | null | undefined;
  cancelReason?: String_Comparison_Exp | null | undefined;
  createdAt?: Numeric_Comparison_Exp | null | undefined;
  dropReason?: Int_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  intent?: Int_Comparison_Exp | null | undefined;
  isBid?: Boolean_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  orderIdRaw?: Numeric_Comparison_Exp | null | undefined;
  orderType?: Int_Comparison_Exp | null | undefined;
  owner?: String_Comparison_Exp | null | undefined;
  placedOrderId?: Numeric_Comparison_Exp | null | undefined;
  quantity?: Numeric_Comparison_Exp | null | undefined;
  registry?: String_Comparison_Exp | null | undefined;
  siblingOrderId?: Numeric_Comparison_Exp | null | undefined;
  status?: Stoporderstatus_Comparison_Exp | null | undefined;
  triggerOperator?: Int_Comparison_Exp | null | undefined;
  triggerPrice?: Numeric_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
  updatedAt?: Numeric_Comparison_Exp | null | undefined;
};

/** order by max() on columns of table "StopOrder" */
export type StopOrder_Max_Order_By = {
  builder?: Order_By | null | undefined;
  /**
   * PERP only — the builder fee the triggered IOC will charge, in bps x 1000 (so 1500 =
   * 1.5bps). Zero on a spot stop, whose registry event carries no such field.
   *
   * Indexed because this is the only chance to capture it. The registry deletes a pending
   * order on every fire, so once triggered nothing on chain can answer what fee was
   * agreed, and `PendingOrderCreated` is the sole record — a column added later would be
   * null for every order that has already fired, and populating it would need another
   * full reindex.
   */
  builderFeeBpsTimes1k?: Order_By | null | undefined;
  /**
   * WHY a stop reached `CANCELLED`. Null on every non-cancelled row.
   *
   *   Owner       the owner cancelled it (`cancelPendingOrder` / `cancelPendingOrders`)
   *   LinkedFill  PERP only — the protocol retired it because its OCO sibling FILLED
   *   Inert       a keeper swept it after the registry's Schedule chain wound down
   *
   * Deliberately the same name and shape as `Order.cancelReason` (:642) — the same question
   * asked of a different entity — and a String of names rather than an index like
   * `dropReason` above, which is an index only because it mirrors a contract `uint8`
   * arriving on the wire. Nothing on chain ranks these three: they arrive as three distinct
   * events (`PendingOrderCancelled`, `LinkedOrderCancelled`, `InertOrderCancelled`), so the
   * vocabulary is the indexer's own, and a name needs no decode table to stay in step.
   *
   * `status` cannot carry this. `StopOrderStatus` is a published SDK union and a filter
   * argument on both listings, so a fourth member would break every consumer that switches
   * exhaustively AND silently change what `status: ["CANCELLED"]` returns — an existing
   * caller would stop seeing rows it sees today. A nullable column beside it changes nothing
   * for anyone not reading it.
   *
   * All three end the same way for the trader — the order is no longer working — but they
   * are three different stories and two different refunds, and a UI that renders CANCELLED
   * as "you cancelled this, SOMI refunded to your wallet" is wrong for two of them:
   *
   *   Owner pushes the SOMI back to the owner in the cancelling transaction.
   *   LinkedFill and Inert only CREDIT `unclaimedSomi`, recoverable via `claimSomi()`.
   *
   * Not a GraphQL enum, for the same reason `Order.cancelReason` is not: envio serves enums
   * as bare Hasura scalars, so the SDK union that would have to mirror it is pinned by
   * `test/enumParity.test.ts` — a coupling worth paying for a status a client FILTERS on,
   * and not worth it for a cause a client only displays.
   */
  cancelReason?: Order_By | null | undefined;
  createdAt?: Order_By | null | undefined;
  /**
   * PERP only — WHY a trigger placed nothing, when `status` is TRIGGER_FAILED.
   *
   *   0 None                    (unused here; a successful trigger records null)
   *   1 ReduceOnlyNoPosition    fired with no position left to reduce
   *   2 ReduceOnlyWrongSide     the position flipped before it fired
   *   3 ReduceOnlyBelowMinQty   what remained was below the pool's minimum
   *   4 PlacementFailed         the pool rejected the order outright
   *   5 NoFill                  the pool ACCEPTED the order and it traded nothing
   *
   * Null on spot, and null on success. The distinction is load-bearing for a UI: 1-3 and
   * 5 are ordinary outcomes of a stop that was overtaken by events or by a thin book,
   * while 4 is a real rejection — collapsing them to "failed" makes routine behaviour look
   * broken. SOMI is consumed on every fire regardless.
   *
   * 5 was APPENDED by the registry; every earlier value keeps its number, so rows indexed
   * before it are unaffected. It exists because an accepted placement is not an executed
   * one: the pool decides an IOC's fate on a dry run, and the real run can fill less —
   * including nothing — when it pulls a maker the dry run had counted. That outcome
   * previously arrived as `success = true`, which reported a stop that protected nothing
   * as having worked.
   */
  dropReason?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  /**
   * PERP only — whether the triggered order may only REDUCE the owner's position, or may
   * open and increase one.
   *
   *   0 ReduceOnly   a take-profit / stop-loss (the default, and every pre-upgrade order)
   *   1 Opening      a stop-entry / breakout, gated on initial margin at creation
   *
   * Zero means ReduceOnly deliberately: the registry appended this field, so every order
   * created before it reads back as zero and MUST keep its original meaning. Null on spot,
   * whose registry has no such concept.
   */
  intent?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  orderIdRaw?: Order_By | null | undefined;
  /** 0 = LIMIT, 1 = MARKET */
  orderType?: Order_By | null | undefined;
  owner?: Order_By | null | undefined;
  /**
   * Pool order id created on a successful trigger — a SpotPool order for a SPOT market,
   * a PerpPool order for a PERP one. Null until triggered, and null on a trigger that
   * fired but placed nothing (see dropReason). Renamed from `spotOrderId` when perps
   * joined this entity: one registry shape serves both, and a spot-only name on a shared
   * column reads as "perps do not trigger", which is the opposite of true.
   */
  placedOrderId?: Order_By | null | undefined;
  quantity?: Order_By | null | undefined;
  registry?: Order_By | null | undefined;
  /**
   * PERP only — the LIVE link to this stop's OCO sibling, when this stop is one leg of a
   * take-profit / stop-loss pair. Null when unlinked, and null on every spot stop.
   *
   * A pair is one trader intent expressed as two orders: when one leg triggers AND FILLS
   * the registry cancels the other and refunds its SOMI. Without this column a client
   * shows two unrelated stops and cannot say that cancelling one leaves the other armed.
   *
   * Mutable, unlike most of this row. A leg that fires WITHOUT filling leaves its partner
   * live and UNLINKED (back to null), which is what lets the survivor be re-paired.
   *
   * LIVE is the whole contract, and it is why every TERMINAL write clears this. A pair's
   * two rows leave at different times, so a surviving pointer on a departed row names an
   * order whose own state has moved on: the trader cancels leg A, the chain unlinks B, and
   * a row A still pointing at B invites a client acting on "cancel the pair" to tear down
   * a stop the trader deliberately kept armed. Provenance — which leg retired which —
   * deliberately does NOT live here; `cancelReason` carries the cause instead.
   */
  siblingOrderId?: Order_By | null | undefined;
  status?: Order_By | null | undefined;
  /** 0 = GTE, 1 = LTE (mark price vs trigger price) */
  triggerOperator?: Order_By | null | undefined;
  triggerPrice?: Order_By | null | undefined;
  txHash?: Order_By | null | undefined;
  updatedAt?: Order_By | null | undefined;
};

/** order by min() on columns of table "StopOrder" */
export type StopOrder_Min_Order_By = {
  builder?: Order_By | null | undefined;
  /**
   * PERP only — the builder fee the triggered IOC will charge, in bps x 1000 (so 1500 =
   * 1.5bps). Zero on a spot stop, whose registry event carries no such field.
   *
   * Indexed because this is the only chance to capture it. The registry deletes a pending
   * order on every fire, so once triggered nothing on chain can answer what fee was
   * agreed, and `PendingOrderCreated` is the sole record — a column added later would be
   * null for every order that has already fired, and populating it would need another
   * full reindex.
   */
  builderFeeBpsTimes1k?: Order_By | null | undefined;
  /**
   * WHY a stop reached `CANCELLED`. Null on every non-cancelled row.
   *
   *   Owner       the owner cancelled it (`cancelPendingOrder` / `cancelPendingOrders`)
   *   LinkedFill  PERP only — the protocol retired it because its OCO sibling FILLED
   *   Inert       a keeper swept it after the registry's Schedule chain wound down
   *
   * Deliberately the same name and shape as `Order.cancelReason` (:642) — the same question
   * asked of a different entity — and a String of names rather than an index like
   * `dropReason` above, which is an index only because it mirrors a contract `uint8`
   * arriving on the wire. Nothing on chain ranks these three: they arrive as three distinct
   * events (`PendingOrderCancelled`, `LinkedOrderCancelled`, `InertOrderCancelled`), so the
   * vocabulary is the indexer's own, and a name needs no decode table to stay in step.
   *
   * `status` cannot carry this. `StopOrderStatus` is a published SDK union and a filter
   * argument on both listings, so a fourth member would break every consumer that switches
   * exhaustively AND silently change what `status: ["CANCELLED"]` returns — an existing
   * caller would stop seeing rows it sees today. A nullable column beside it changes nothing
   * for anyone not reading it.
   *
   * All three end the same way for the trader — the order is no longer working — but they
   * are three different stories and two different refunds, and a UI that renders CANCELLED
   * as "you cancelled this, SOMI refunded to your wallet" is wrong for two of them:
   *
   *   Owner pushes the SOMI back to the owner in the cancelling transaction.
   *   LinkedFill and Inert only CREDIT `unclaimedSomi`, recoverable via `claimSomi()`.
   *
   * Not a GraphQL enum, for the same reason `Order.cancelReason` is not: envio serves enums
   * as bare Hasura scalars, so the SDK union that would have to mirror it is pinned by
   * `test/enumParity.test.ts` — a coupling worth paying for a status a client FILTERS on,
   * and not worth it for a cause a client only displays.
   */
  cancelReason?: Order_By | null | undefined;
  createdAt?: Order_By | null | undefined;
  /**
   * PERP only — WHY a trigger placed nothing, when `status` is TRIGGER_FAILED.
   *
   *   0 None                    (unused here; a successful trigger records null)
   *   1 ReduceOnlyNoPosition    fired with no position left to reduce
   *   2 ReduceOnlyWrongSide     the position flipped before it fired
   *   3 ReduceOnlyBelowMinQty   what remained was below the pool's minimum
   *   4 PlacementFailed         the pool rejected the order outright
   *   5 NoFill                  the pool ACCEPTED the order and it traded nothing
   *
   * Null on spot, and null on success. The distinction is load-bearing for a UI: 1-3 and
   * 5 are ordinary outcomes of a stop that was overtaken by events or by a thin book,
   * while 4 is a real rejection — collapsing them to "failed" makes routine behaviour look
   * broken. SOMI is consumed on every fire regardless.
   *
   * 5 was APPENDED by the registry; every earlier value keeps its number, so rows indexed
   * before it are unaffected. It exists because an accepted placement is not an executed
   * one: the pool decides an IOC's fate on a dry run, and the real run can fill less —
   * including nothing — when it pulls a maker the dry run had counted. That outcome
   * previously arrived as `success = true`, which reported a stop that protected nothing
   * as having worked.
   */
  dropReason?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  /**
   * PERP only — whether the triggered order may only REDUCE the owner's position, or may
   * open and increase one.
   *
   *   0 ReduceOnly   a take-profit / stop-loss (the default, and every pre-upgrade order)
   *   1 Opening      a stop-entry / breakout, gated on initial margin at creation
   *
   * Zero means ReduceOnly deliberately: the registry appended this field, so every order
   * created before it reads back as zero and MUST keep its original meaning. Null on spot,
   * whose registry has no such concept.
   */
  intent?: Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  orderIdRaw?: Order_By | null | undefined;
  /** 0 = LIMIT, 1 = MARKET */
  orderType?: Order_By | null | undefined;
  owner?: Order_By | null | undefined;
  /**
   * Pool order id created on a successful trigger — a SpotPool order for a SPOT market,
   * a PerpPool order for a PERP one. Null until triggered, and null on a trigger that
   * fired but placed nothing (see dropReason). Renamed from `spotOrderId` when perps
   * joined this entity: one registry shape serves both, and a spot-only name on a shared
   * column reads as "perps do not trigger", which is the opposite of true.
   */
  placedOrderId?: Order_By | null | undefined;
  quantity?: Order_By | null | undefined;
  registry?: Order_By | null | undefined;
  /**
   * PERP only — the LIVE link to this stop's OCO sibling, when this stop is one leg of a
   * take-profit / stop-loss pair. Null when unlinked, and null on every spot stop.
   *
   * A pair is one trader intent expressed as two orders: when one leg triggers AND FILLS
   * the registry cancels the other and refunds its SOMI. Without this column a client
   * shows two unrelated stops and cannot say that cancelling one leaves the other armed.
   *
   * Mutable, unlike most of this row. A leg that fires WITHOUT filling leaves its partner
   * live and UNLINKED (back to null), which is what lets the survivor be re-paired.
   *
   * LIVE is the whole contract, and it is why every TERMINAL write clears this. A pair's
   * two rows leave at different times, so a surviving pointer on a departed row names an
   * order whose own state has moved on: the trader cancels leg A, the chain unlinks B, and
   * a row A still pointing at B invites a client acting on "cancel the pair" to tear down
   * a stop the trader deliberately kept armed. Provenance — which leg retired which —
   * deliberately does NOT live here; `cancelReason` carries the cause instead.
   */
  siblingOrderId?: Order_By | null | undefined;
  status?: Order_By | null | undefined;
  /** 0 = GTE, 1 = LTE (mark price vs trigger price) */
  triggerOperator?: Order_By | null | undefined;
  triggerPrice?: Order_By | null | undefined;
  txHash?: Order_By | null | undefined;
  updatedAt?: Order_By | null | undefined;
};

/** select columns of table "StopOrder" */
export type StopOrder_Select_Column =
  /** column name */
  | 'builder'
  /** column name */
  | 'builderFeeBpsTimes1k'
  /** column name */
  | 'cancelReason'
  /** column name */
  | 'createdAt'
  /** column name */
  | 'dropReason'
  /** column name */
  | 'id'
  /** column name */
  | 'intent'
  /** column name */
  | 'isBid'
  /** column name */
  | 'market_id'
  /** column name */
  | 'orderIdRaw'
  /** column name */
  | 'orderType'
  /** column name */
  | 'owner'
  /** column name */
  | 'placedOrderId'
  /** column name */
  | 'quantity'
  /** column name */
  | 'registry'
  /** column name */
  | 'siblingOrderId'
  /** column name */
  | 'status'
  /** column name */
  | 'triggerOperator'
  /** column name */
  | 'triggerPrice'
  /** column name */
  | 'txHash'
  /** column name */
  | 'updatedAt';

/** select "StopOrder_aggregate_bool_exp_bool_and_arguments_columns" columns of table "StopOrder" */
export type StopOrder_Select_Column_StopOrder_Aggregate_Bool_Exp_Bool_And_Arguments_Columns =
  /** column name */
  | 'isBid';

/** select "StopOrder_aggregate_bool_exp_bool_or_arguments_columns" columns of table "StopOrder" */
export type StopOrder_Select_Column_StopOrder_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns =
  /** column name */
  | 'isBid';

/** order by stddev() on columns of table "StopOrder" */
export type StopOrder_Stddev_Order_By = {
  /**
   * PERP only — the builder fee the triggered IOC will charge, in bps x 1000 (so 1500 =
   * 1.5bps). Zero on a spot stop, whose registry event carries no such field.
   *
   * Indexed because this is the only chance to capture it. The registry deletes a pending
   * order on every fire, so once triggered nothing on chain can answer what fee was
   * agreed, and `PendingOrderCreated` is the sole record — a column added later would be
   * null for every order that has already fired, and populating it would need another
   * full reindex.
   */
  builderFeeBpsTimes1k?: Order_By | null | undefined;
  createdAt?: Order_By | null | undefined;
  /**
   * PERP only — WHY a trigger placed nothing, when `status` is TRIGGER_FAILED.
   *
   *   0 None                    (unused here; a successful trigger records null)
   *   1 ReduceOnlyNoPosition    fired with no position left to reduce
   *   2 ReduceOnlyWrongSide     the position flipped before it fired
   *   3 ReduceOnlyBelowMinQty   what remained was below the pool's minimum
   *   4 PlacementFailed         the pool rejected the order outright
   *   5 NoFill                  the pool ACCEPTED the order and it traded nothing
   *
   * Null on spot, and null on success. The distinction is load-bearing for a UI: 1-3 and
   * 5 are ordinary outcomes of a stop that was overtaken by events or by a thin book,
   * while 4 is a real rejection — collapsing them to "failed" makes routine behaviour look
   * broken. SOMI is consumed on every fire regardless.
   *
   * 5 was APPENDED by the registry; every earlier value keeps its number, so rows indexed
   * before it are unaffected. It exists because an accepted placement is not an executed
   * one: the pool decides an IOC's fate on a dry run, and the real run can fill less —
   * including nothing — when it pulls a maker the dry run had counted. That outcome
   * previously arrived as `success = true`, which reported a stop that protected nothing
   * as having worked.
   */
  dropReason?: Order_By | null | undefined;
  /**
   * PERP only — whether the triggered order may only REDUCE the owner's position, or may
   * open and increase one.
   *
   *   0 ReduceOnly   a take-profit / stop-loss (the default, and every pre-upgrade order)
   *   1 Opening      a stop-entry / breakout, gated on initial margin at creation
   *
   * Zero means ReduceOnly deliberately: the registry appended this field, so every order
   * created before it reads back as zero and MUST keep its original meaning. Null on spot,
   * whose registry has no such concept.
   */
  intent?: Order_By | null | undefined;
  orderIdRaw?: Order_By | null | undefined;
  /** 0 = LIMIT, 1 = MARKET */
  orderType?: Order_By | null | undefined;
  /**
   * Pool order id created on a successful trigger — a SpotPool order for a SPOT market,
   * a PerpPool order for a PERP one. Null until triggered, and null on a trigger that
   * fired but placed nothing (see dropReason). Renamed from `spotOrderId` when perps
   * joined this entity: one registry shape serves both, and a spot-only name on a shared
   * column reads as "perps do not trigger", which is the opposite of true.
   */
  placedOrderId?: Order_By | null | undefined;
  quantity?: Order_By | null | undefined;
  /**
   * PERP only — the LIVE link to this stop's OCO sibling, when this stop is one leg of a
   * take-profit / stop-loss pair. Null when unlinked, and null on every spot stop.
   *
   * A pair is one trader intent expressed as two orders: when one leg triggers AND FILLS
   * the registry cancels the other and refunds its SOMI. Without this column a client
   * shows two unrelated stops and cannot say that cancelling one leaves the other armed.
   *
   * Mutable, unlike most of this row. A leg that fires WITHOUT filling leaves its partner
   * live and UNLINKED (back to null), which is what lets the survivor be re-paired.
   *
   * LIVE is the whole contract, and it is why every TERMINAL write clears this. A pair's
   * two rows leave at different times, so a surviving pointer on a departed row names an
   * order whose own state has moved on: the trader cancels leg A, the chain unlinks B, and
   * a row A still pointing at B invites a client acting on "cancel the pair" to tear down
   * a stop the trader deliberately kept armed. Provenance — which leg retired which —
   * deliberately does NOT live here; `cancelReason` carries the cause instead.
   */
  siblingOrderId?: Order_By | null | undefined;
  /** 0 = GTE, 1 = LTE (mark price vs trigger price) */
  triggerOperator?: Order_By | null | undefined;
  triggerPrice?: Order_By | null | undefined;
  updatedAt?: Order_By | null | undefined;
};

/** order by stddev_pop() on columns of table "StopOrder" */
export type StopOrder_Stddev_Pop_Order_By = {
  /**
   * PERP only — the builder fee the triggered IOC will charge, in bps x 1000 (so 1500 =
   * 1.5bps). Zero on a spot stop, whose registry event carries no such field.
   *
   * Indexed because this is the only chance to capture it. The registry deletes a pending
   * order on every fire, so once triggered nothing on chain can answer what fee was
   * agreed, and `PendingOrderCreated` is the sole record — a column added later would be
   * null for every order that has already fired, and populating it would need another
   * full reindex.
   */
  builderFeeBpsTimes1k?: Order_By | null | undefined;
  createdAt?: Order_By | null | undefined;
  /**
   * PERP only — WHY a trigger placed nothing, when `status` is TRIGGER_FAILED.
   *
   *   0 None                    (unused here; a successful trigger records null)
   *   1 ReduceOnlyNoPosition    fired with no position left to reduce
   *   2 ReduceOnlyWrongSide     the position flipped before it fired
   *   3 ReduceOnlyBelowMinQty   what remained was below the pool's minimum
   *   4 PlacementFailed         the pool rejected the order outright
   *   5 NoFill                  the pool ACCEPTED the order and it traded nothing
   *
   * Null on spot, and null on success. The distinction is load-bearing for a UI: 1-3 and
   * 5 are ordinary outcomes of a stop that was overtaken by events or by a thin book,
   * while 4 is a real rejection — collapsing them to "failed" makes routine behaviour look
   * broken. SOMI is consumed on every fire regardless.
   *
   * 5 was APPENDED by the registry; every earlier value keeps its number, so rows indexed
   * before it are unaffected. It exists because an accepted placement is not an executed
   * one: the pool decides an IOC's fate on a dry run, and the real run can fill less —
   * including nothing — when it pulls a maker the dry run had counted. That outcome
   * previously arrived as `success = true`, which reported a stop that protected nothing
   * as having worked.
   */
  dropReason?: Order_By | null | undefined;
  /**
   * PERP only — whether the triggered order may only REDUCE the owner's position, or may
   * open and increase one.
   *
   *   0 ReduceOnly   a take-profit / stop-loss (the default, and every pre-upgrade order)
   *   1 Opening      a stop-entry / breakout, gated on initial margin at creation
   *
   * Zero means ReduceOnly deliberately: the registry appended this field, so every order
   * created before it reads back as zero and MUST keep its original meaning. Null on spot,
   * whose registry has no such concept.
   */
  intent?: Order_By | null | undefined;
  orderIdRaw?: Order_By | null | undefined;
  /** 0 = LIMIT, 1 = MARKET */
  orderType?: Order_By | null | undefined;
  /**
   * Pool order id created on a successful trigger — a SpotPool order for a SPOT market,
   * a PerpPool order for a PERP one. Null until triggered, and null on a trigger that
   * fired but placed nothing (see dropReason). Renamed from `spotOrderId` when perps
   * joined this entity: one registry shape serves both, and a spot-only name on a shared
   * column reads as "perps do not trigger", which is the opposite of true.
   */
  placedOrderId?: Order_By | null | undefined;
  quantity?: Order_By | null | undefined;
  /**
   * PERP only — the LIVE link to this stop's OCO sibling, when this stop is one leg of a
   * take-profit / stop-loss pair. Null when unlinked, and null on every spot stop.
   *
   * A pair is one trader intent expressed as two orders: when one leg triggers AND FILLS
   * the registry cancels the other and refunds its SOMI. Without this column a client
   * shows two unrelated stops and cannot say that cancelling one leaves the other armed.
   *
   * Mutable, unlike most of this row. A leg that fires WITHOUT filling leaves its partner
   * live and UNLINKED (back to null), which is what lets the survivor be re-paired.
   *
   * LIVE is the whole contract, and it is why every TERMINAL write clears this. A pair's
   * two rows leave at different times, so a surviving pointer on a departed row names an
   * order whose own state has moved on: the trader cancels leg A, the chain unlinks B, and
   * a row A still pointing at B invites a client acting on "cancel the pair" to tear down
   * a stop the trader deliberately kept armed. Provenance — which leg retired which —
   * deliberately does NOT live here; `cancelReason` carries the cause instead.
   */
  siblingOrderId?: Order_By | null | undefined;
  /** 0 = GTE, 1 = LTE (mark price vs trigger price) */
  triggerOperator?: Order_By | null | undefined;
  triggerPrice?: Order_By | null | undefined;
  updatedAt?: Order_By | null | undefined;
};

/** order by stddev_samp() on columns of table "StopOrder" */
export type StopOrder_Stddev_Samp_Order_By = {
  /**
   * PERP only — the builder fee the triggered IOC will charge, in bps x 1000 (so 1500 =
   * 1.5bps). Zero on a spot stop, whose registry event carries no such field.
   *
   * Indexed because this is the only chance to capture it. The registry deletes a pending
   * order on every fire, so once triggered nothing on chain can answer what fee was
   * agreed, and `PendingOrderCreated` is the sole record — a column added later would be
   * null for every order that has already fired, and populating it would need another
   * full reindex.
   */
  builderFeeBpsTimes1k?: Order_By | null | undefined;
  createdAt?: Order_By | null | undefined;
  /**
   * PERP only — WHY a trigger placed nothing, when `status` is TRIGGER_FAILED.
   *
   *   0 None                    (unused here; a successful trigger records null)
   *   1 ReduceOnlyNoPosition    fired with no position left to reduce
   *   2 ReduceOnlyWrongSide     the position flipped before it fired
   *   3 ReduceOnlyBelowMinQty   what remained was below the pool's minimum
   *   4 PlacementFailed         the pool rejected the order outright
   *   5 NoFill                  the pool ACCEPTED the order and it traded nothing
   *
   * Null on spot, and null on success. The distinction is load-bearing for a UI: 1-3 and
   * 5 are ordinary outcomes of a stop that was overtaken by events or by a thin book,
   * while 4 is a real rejection — collapsing them to "failed" makes routine behaviour look
   * broken. SOMI is consumed on every fire regardless.
   *
   * 5 was APPENDED by the registry; every earlier value keeps its number, so rows indexed
   * before it are unaffected. It exists because an accepted placement is not an executed
   * one: the pool decides an IOC's fate on a dry run, and the real run can fill less —
   * including nothing — when it pulls a maker the dry run had counted. That outcome
   * previously arrived as `success = true`, which reported a stop that protected nothing
   * as having worked.
   */
  dropReason?: Order_By | null | undefined;
  /**
   * PERP only — whether the triggered order may only REDUCE the owner's position, or may
   * open and increase one.
   *
   *   0 ReduceOnly   a take-profit / stop-loss (the default, and every pre-upgrade order)
   *   1 Opening      a stop-entry / breakout, gated on initial margin at creation
   *
   * Zero means ReduceOnly deliberately: the registry appended this field, so every order
   * created before it reads back as zero and MUST keep its original meaning. Null on spot,
   * whose registry has no such concept.
   */
  intent?: Order_By | null | undefined;
  orderIdRaw?: Order_By | null | undefined;
  /** 0 = LIMIT, 1 = MARKET */
  orderType?: Order_By | null | undefined;
  /**
   * Pool order id created on a successful trigger — a SpotPool order for a SPOT market,
   * a PerpPool order for a PERP one. Null until triggered, and null on a trigger that
   * fired but placed nothing (see dropReason). Renamed from `spotOrderId` when perps
   * joined this entity: one registry shape serves both, and a spot-only name on a shared
   * column reads as "perps do not trigger", which is the opposite of true.
   */
  placedOrderId?: Order_By | null | undefined;
  quantity?: Order_By | null | undefined;
  /**
   * PERP only — the LIVE link to this stop's OCO sibling, when this stop is one leg of a
   * take-profit / stop-loss pair. Null when unlinked, and null on every spot stop.
   *
   * A pair is one trader intent expressed as two orders: when one leg triggers AND FILLS
   * the registry cancels the other and refunds its SOMI. Without this column a client
   * shows two unrelated stops and cannot say that cancelling one leaves the other armed.
   *
   * Mutable, unlike most of this row. A leg that fires WITHOUT filling leaves its partner
   * live and UNLINKED (back to null), which is what lets the survivor be re-paired.
   *
   * LIVE is the whole contract, and it is why every TERMINAL write clears this. A pair's
   * two rows leave at different times, so a surviving pointer on a departed row names an
   * order whose own state has moved on: the trader cancels leg A, the chain unlinks B, and
   * a row A still pointing at B invites a client acting on "cancel the pair" to tear down
   * a stop the trader deliberately kept armed. Provenance — which leg retired which —
   * deliberately does NOT live here; `cancelReason` carries the cause instead.
   */
  siblingOrderId?: Order_By | null | undefined;
  /** 0 = GTE, 1 = LTE (mark price vs trigger price) */
  triggerOperator?: Order_By | null | undefined;
  triggerPrice?: Order_By | null | undefined;
  updatedAt?: Order_By | null | undefined;
};

/** order by sum() on columns of table "StopOrder" */
export type StopOrder_Sum_Order_By = {
  /**
   * PERP only — the builder fee the triggered IOC will charge, in bps x 1000 (so 1500 =
   * 1.5bps). Zero on a spot stop, whose registry event carries no such field.
   *
   * Indexed because this is the only chance to capture it. The registry deletes a pending
   * order on every fire, so once triggered nothing on chain can answer what fee was
   * agreed, and `PendingOrderCreated` is the sole record — a column added later would be
   * null for every order that has already fired, and populating it would need another
   * full reindex.
   */
  builderFeeBpsTimes1k?: Order_By | null | undefined;
  createdAt?: Order_By | null | undefined;
  /**
   * PERP only — WHY a trigger placed nothing, when `status` is TRIGGER_FAILED.
   *
   *   0 None                    (unused here; a successful trigger records null)
   *   1 ReduceOnlyNoPosition    fired with no position left to reduce
   *   2 ReduceOnlyWrongSide     the position flipped before it fired
   *   3 ReduceOnlyBelowMinQty   what remained was below the pool's minimum
   *   4 PlacementFailed         the pool rejected the order outright
   *   5 NoFill                  the pool ACCEPTED the order and it traded nothing
   *
   * Null on spot, and null on success. The distinction is load-bearing for a UI: 1-3 and
   * 5 are ordinary outcomes of a stop that was overtaken by events or by a thin book,
   * while 4 is a real rejection — collapsing them to "failed" makes routine behaviour look
   * broken. SOMI is consumed on every fire regardless.
   *
   * 5 was APPENDED by the registry; every earlier value keeps its number, so rows indexed
   * before it are unaffected. It exists because an accepted placement is not an executed
   * one: the pool decides an IOC's fate on a dry run, and the real run can fill less —
   * including nothing — when it pulls a maker the dry run had counted. That outcome
   * previously arrived as `success = true`, which reported a stop that protected nothing
   * as having worked.
   */
  dropReason?: Order_By | null | undefined;
  /**
   * PERP only — whether the triggered order may only REDUCE the owner's position, or may
   * open and increase one.
   *
   *   0 ReduceOnly   a take-profit / stop-loss (the default, and every pre-upgrade order)
   *   1 Opening      a stop-entry / breakout, gated on initial margin at creation
   *
   * Zero means ReduceOnly deliberately: the registry appended this field, so every order
   * created before it reads back as zero and MUST keep its original meaning. Null on spot,
   * whose registry has no such concept.
   */
  intent?: Order_By | null | undefined;
  orderIdRaw?: Order_By | null | undefined;
  /** 0 = LIMIT, 1 = MARKET */
  orderType?: Order_By | null | undefined;
  /**
   * Pool order id created on a successful trigger — a SpotPool order for a SPOT market,
   * a PerpPool order for a PERP one. Null until triggered, and null on a trigger that
   * fired but placed nothing (see dropReason). Renamed from `spotOrderId` when perps
   * joined this entity: one registry shape serves both, and a spot-only name on a shared
   * column reads as "perps do not trigger", which is the opposite of true.
   */
  placedOrderId?: Order_By | null | undefined;
  quantity?: Order_By | null | undefined;
  /**
   * PERP only — the LIVE link to this stop's OCO sibling, when this stop is one leg of a
   * take-profit / stop-loss pair. Null when unlinked, and null on every spot stop.
   *
   * A pair is one trader intent expressed as two orders: when one leg triggers AND FILLS
   * the registry cancels the other and refunds its SOMI. Without this column a client
   * shows two unrelated stops and cannot say that cancelling one leaves the other armed.
   *
   * Mutable, unlike most of this row. A leg that fires WITHOUT filling leaves its partner
   * live and UNLINKED (back to null), which is what lets the survivor be re-paired.
   *
   * LIVE is the whole contract, and it is why every TERMINAL write clears this. A pair's
   * two rows leave at different times, so a surviving pointer on a departed row names an
   * order whose own state has moved on: the trader cancels leg A, the chain unlinks B, and
   * a row A still pointing at B invites a client acting on "cancel the pair" to tear down
   * a stop the trader deliberately kept armed. Provenance — which leg retired which —
   * deliberately does NOT live here; `cancelReason` carries the cause instead.
   */
  siblingOrderId?: Order_By | null | undefined;
  /** 0 = GTE, 1 = LTE (mark price vs trigger price) */
  triggerOperator?: Order_By | null | undefined;
  triggerPrice?: Order_By | null | undefined;
  updatedAt?: Order_By | null | undefined;
};

/** order by var_pop() on columns of table "StopOrder" */
export type StopOrder_Var_Pop_Order_By = {
  /**
   * PERP only — the builder fee the triggered IOC will charge, in bps x 1000 (so 1500 =
   * 1.5bps). Zero on a spot stop, whose registry event carries no such field.
   *
   * Indexed because this is the only chance to capture it. The registry deletes a pending
   * order on every fire, so once triggered nothing on chain can answer what fee was
   * agreed, and `PendingOrderCreated` is the sole record — a column added later would be
   * null for every order that has already fired, and populating it would need another
   * full reindex.
   */
  builderFeeBpsTimes1k?: Order_By | null | undefined;
  createdAt?: Order_By | null | undefined;
  /**
   * PERP only — WHY a trigger placed nothing, when `status` is TRIGGER_FAILED.
   *
   *   0 None                    (unused here; a successful trigger records null)
   *   1 ReduceOnlyNoPosition    fired with no position left to reduce
   *   2 ReduceOnlyWrongSide     the position flipped before it fired
   *   3 ReduceOnlyBelowMinQty   what remained was below the pool's minimum
   *   4 PlacementFailed         the pool rejected the order outright
   *   5 NoFill                  the pool ACCEPTED the order and it traded nothing
   *
   * Null on spot, and null on success. The distinction is load-bearing for a UI: 1-3 and
   * 5 are ordinary outcomes of a stop that was overtaken by events or by a thin book,
   * while 4 is a real rejection — collapsing them to "failed" makes routine behaviour look
   * broken. SOMI is consumed on every fire regardless.
   *
   * 5 was APPENDED by the registry; every earlier value keeps its number, so rows indexed
   * before it are unaffected. It exists because an accepted placement is not an executed
   * one: the pool decides an IOC's fate on a dry run, and the real run can fill less —
   * including nothing — when it pulls a maker the dry run had counted. That outcome
   * previously arrived as `success = true`, which reported a stop that protected nothing
   * as having worked.
   */
  dropReason?: Order_By | null | undefined;
  /**
   * PERP only — whether the triggered order may only REDUCE the owner's position, or may
   * open and increase one.
   *
   *   0 ReduceOnly   a take-profit / stop-loss (the default, and every pre-upgrade order)
   *   1 Opening      a stop-entry / breakout, gated on initial margin at creation
   *
   * Zero means ReduceOnly deliberately: the registry appended this field, so every order
   * created before it reads back as zero and MUST keep its original meaning. Null on spot,
   * whose registry has no such concept.
   */
  intent?: Order_By | null | undefined;
  orderIdRaw?: Order_By | null | undefined;
  /** 0 = LIMIT, 1 = MARKET */
  orderType?: Order_By | null | undefined;
  /**
   * Pool order id created on a successful trigger — a SpotPool order for a SPOT market,
   * a PerpPool order for a PERP one. Null until triggered, and null on a trigger that
   * fired but placed nothing (see dropReason). Renamed from `spotOrderId` when perps
   * joined this entity: one registry shape serves both, and a spot-only name on a shared
   * column reads as "perps do not trigger", which is the opposite of true.
   */
  placedOrderId?: Order_By | null | undefined;
  quantity?: Order_By | null | undefined;
  /**
   * PERP only — the LIVE link to this stop's OCO sibling, when this stop is one leg of a
   * take-profit / stop-loss pair. Null when unlinked, and null on every spot stop.
   *
   * A pair is one trader intent expressed as two orders: when one leg triggers AND FILLS
   * the registry cancels the other and refunds its SOMI. Without this column a client
   * shows two unrelated stops and cannot say that cancelling one leaves the other armed.
   *
   * Mutable, unlike most of this row. A leg that fires WITHOUT filling leaves its partner
   * live and UNLINKED (back to null), which is what lets the survivor be re-paired.
   *
   * LIVE is the whole contract, and it is why every TERMINAL write clears this. A pair's
   * two rows leave at different times, so a surviving pointer on a departed row names an
   * order whose own state has moved on: the trader cancels leg A, the chain unlinks B, and
   * a row A still pointing at B invites a client acting on "cancel the pair" to tear down
   * a stop the trader deliberately kept armed. Provenance — which leg retired which —
   * deliberately does NOT live here; `cancelReason` carries the cause instead.
   */
  siblingOrderId?: Order_By | null | undefined;
  /** 0 = GTE, 1 = LTE (mark price vs trigger price) */
  triggerOperator?: Order_By | null | undefined;
  triggerPrice?: Order_By | null | undefined;
  updatedAt?: Order_By | null | undefined;
};

/** order by var_samp() on columns of table "StopOrder" */
export type StopOrder_Var_Samp_Order_By = {
  /**
   * PERP only — the builder fee the triggered IOC will charge, in bps x 1000 (so 1500 =
   * 1.5bps). Zero on a spot stop, whose registry event carries no such field.
   *
   * Indexed because this is the only chance to capture it. The registry deletes a pending
   * order on every fire, so once triggered nothing on chain can answer what fee was
   * agreed, and `PendingOrderCreated` is the sole record — a column added later would be
   * null for every order that has already fired, and populating it would need another
   * full reindex.
   */
  builderFeeBpsTimes1k?: Order_By | null | undefined;
  createdAt?: Order_By | null | undefined;
  /**
   * PERP only — WHY a trigger placed nothing, when `status` is TRIGGER_FAILED.
   *
   *   0 None                    (unused here; a successful trigger records null)
   *   1 ReduceOnlyNoPosition    fired with no position left to reduce
   *   2 ReduceOnlyWrongSide     the position flipped before it fired
   *   3 ReduceOnlyBelowMinQty   what remained was below the pool's minimum
   *   4 PlacementFailed         the pool rejected the order outright
   *   5 NoFill                  the pool ACCEPTED the order and it traded nothing
   *
   * Null on spot, and null on success. The distinction is load-bearing for a UI: 1-3 and
   * 5 are ordinary outcomes of a stop that was overtaken by events or by a thin book,
   * while 4 is a real rejection — collapsing them to "failed" makes routine behaviour look
   * broken. SOMI is consumed on every fire regardless.
   *
   * 5 was APPENDED by the registry; every earlier value keeps its number, so rows indexed
   * before it are unaffected. It exists because an accepted placement is not an executed
   * one: the pool decides an IOC's fate on a dry run, and the real run can fill less —
   * including nothing — when it pulls a maker the dry run had counted. That outcome
   * previously arrived as `success = true`, which reported a stop that protected nothing
   * as having worked.
   */
  dropReason?: Order_By | null | undefined;
  /**
   * PERP only — whether the triggered order may only REDUCE the owner's position, or may
   * open and increase one.
   *
   *   0 ReduceOnly   a take-profit / stop-loss (the default, and every pre-upgrade order)
   *   1 Opening      a stop-entry / breakout, gated on initial margin at creation
   *
   * Zero means ReduceOnly deliberately: the registry appended this field, so every order
   * created before it reads back as zero and MUST keep its original meaning. Null on spot,
   * whose registry has no such concept.
   */
  intent?: Order_By | null | undefined;
  orderIdRaw?: Order_By | null | undefined;
  /** 0 = LIMIT, 1 = MARKET */
  orderType?: Order_By | null | undefined;
  /**
   * Pool order id created on a successful trigger — a SpotPool order for a SPOT market,
   * a PerpPool order for a PERP one. Null until triggered, and null on a trigger that
   * fired but placed nothing (see dropReason). Renamed from `spotOrderId` when perps
   * joined this entity: one registry shape serves both, and a spot-only name on a shared
   * column reads as "perps do not trigger", which is the opposite of true.
   */
  placedOrderId?: Order_By | null | undefined;
  quantity?: Order_By | null | undefined;
  /**
   * PERP only — the LIVE link to this stop's OCO sibling, when this stop is one leg of a
   * take-profit / stop-loss pair. Null when unlinked, and null on every spot stop.
   *
   * A pair is one trader intent expressed as two orders: when one leg triggers AND FILLS
   * the registry cancels the other and refunds its SOMI. Without this column a client
   * shows two unrelated stops and cannot say that cancelling one leaves the other armed.
   *
   * Mutable, unlike most of this row. A leg that fires WITHOUT filling leaves its partner
   * live and UNLINKED (back to null), which is what lets the survivor be re-paired.
   *
   * LIVE is the whole contract, and it is why every TERMINAL write clears this. A pair's
   * two rows leave at different times, so a surviving pointer on a departed row names an
   * order whose own state has moved on: the trader cancels leg A, the chain unlinks B, and
   * a row A still pointing at B invites a client acting on "cancel the pair" to tear down
   * a stop the trader deliberately kept armed. Provenance — which leg retired which —
   * deliberately does NOT live here; `cancelReason` carries the cause instead.
   */
  siblingOrderId?: Order_By | null | undefined;
  /** 0 = GTE, 1 = LTE (mark price vs trigger price) */
  triggerOperator?: Order_By | null | undefined;
  triggerPrice?: Order_By | null | undefined;
  updatedAt?: Order_By | null | undefined;
};

/** order by variance() on columns of table "StopOrder" */
export type StopOrder_Variance_Order_By = {
  /**
   * PERP only — the builder fee the triggered IOC will charge, in bps x 1000 (so 1500 =
   * 1.5bps). Zero on a spot stop, whose registry event carries no such field.
   *
   * Indexed because this is the only chance to capture it. The registry deletes a pending
   * order on every fire, so once triggered nothing on chain can answer what fee was
   * agreed, and `PendingOrderCreated` is the sole record — a column added later would be
   * null for every order that has already fired, and populating it would need another
   * full reindex.
   */
  builderFeeBpsTimes1k?: Order_By | null | undefined;
  createdAt?: Order_By | null | undefined;
  /**
   * PERP only — WHY a trigger placed nothing, when `status` is TRIGGER_FAILED.
   *
   *   0 None                    (unused here; a successful trigger records null)
   *   1 ReduceOnlyNoPosition    fired with no position left to reduce
   *   2 ReduceOnlyWrongSide     the position flipped before it fired
   *   3 ReduceOnlyBelowMinQty   what remained was below the pool's minimum
   *   4 PlacementFailed         the pool rejected the order outright
   *   5 NoFill                  the pool ACCEPTED the order and it traded nothing
   *
   * Null on spot, and null on success. The distinction is load-bearing for a UI: 1-3 and
   * 5 are ordinary outcomes of a stop that was overtaken by events or by a thin book,
   * while 4 is a real rejection — collapsing them to "failed" makes routine behaviour look
   * broken. SOMI is consumed on every fire regardless.
   *
   * 5 was APPENDED by the registry; every earlier value keeps its number, so rows indexed
   * before it are unaffected. It exists because an accepted placement is not an executed
   * one: the pool decides an IOC's fate on a dry run, and the real run can fill less —
   * including nothing — when it pulls a maker the dry run had counted. That outcome
   * previously arrived as `success = true`, which reported a stop that protected nothing
   * as having worked.
   */
  dropReason?: Order_By | null | undefined;
  /**
   * PERP only — whether the triggered order may only REDUCE the owner's position, or may
   * open and increase one.
   *
   *   0 ReduceOnly   a take-profit / stop-loss (the default, and every pre-upgrade order)
   *   1 Opening      a stop-entry / breakout, gated on initial margin at creation
   *
   * Zero means ReduceOnly deliberately: the registry appended this field, so every order
   * created before it reads back as zero and MUST keep its original meaning. Null on spot,
   * whose registry has no such concept.
   */
  intent?: Order_By | null | undefined;
  orderIdRaw?: Order_By | null | undefined;
  /** 0 = LIMIT, 1 = MARKET */
  orderType?: Order_By | null | undefined;
  /**
   * Pool order id created on a successful trigger — a SpotPool order for a SPOT market,
   * a PerpPool order for a PERP one. Null until triggered, and null on a trigger that
   * fired but placed nothing (see dropReason). Renamed from `spotOrderId` when perps
   * joined this entity: one registry shape serves both, and a spot-only name on a shared
   * column reads as "perps do not trigger", which is the opposite of true.
   */
  placedOrderId?: Order_By | null | undefined;
  quantity?: Order_By | null | undefined;
  /**
   * PERP only — the LIVE link to this stop's OCO sibling, when this stop is one leg of a
   * take-profit / stop-loss pair. Null when unlinked, and null on every spot stop.
   *
   * A pair is one trader intent expressed as two orders: when one leg triggers AND FILLS
   * the registry cancels the other and refunds its SOMI. Without this column a client
   * shows two unrelated stops and cannot say that cancelling one leaves the other armed.
   *
   * Mutable, unlike most of this row. A leg that fires WITHOUT filling leaves its partner
   * live and UNLINKED (back to null), which is what lets the survivor be re-paired.
   *
   * LIVE is the whole contract, and it is why every TERMINAL write clears this. A pair's
   * two rows leave at different times, so a surviving pointer on a departed row names an
   * order whose own state has moved on: the trader cancels leg A, the chain unlinks B, and
   * a row A still pointing at B invites a client acting on "cancel the pair" to tear down
   * a stop the trader deliberately kept armed. Provenance — which leg retired which —
   * deliberately does NOT live here; `cancelReason` carries the cause instead.
   */
  siblingOrderId?: Order_By | null | undefined;
  /** 0 = GTE, 1 = LTE (mark price vs trigger price) */
  triggerOperator?: Order_By | null | undefined;
  triggerPrice?: Order_By | null | undefined;
  updatedAt?: Order_By | null | undefined;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Array_Comparison_Exp = {
  /** is the array contained in the given array value */
  _contained_in?: Array<string> | null | undefined;
  /** does the array contain the given value */
  _contains?: Array<string> | null | undefined;
  _eq?: Array<string> | null | undefined;
  _gt?: Array<string> | null | undefined;
  _gte?: Array<string> | null | undefined;
  _in?: Array<Array<string>> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: Array<string> | null | undefined;
  _lte?: Array<string> | null | undefined;
  _neq?: Array<string> | null | undefined;
  _nin?: Array<Array<string>> | null | undefined;
};

/** Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: string | null | undefined;
  _gt?: string | null | undefined;
  _gte?: string | null | undefined;
  /** does the column match the given case-insensitive pattern */
  _ilike?: string | null | undefined;
  _in?: Array<string> | null | undefined;
  /** does the column match the given POSIX regular expression, case insensitive */
  _iregex?: string | null | undefined;
  _is_null?: boolean | null | undefined;
  /** does the column match the given pattern */
  _like?: string | null | undefined;
  _lt?: string | null | undefined;
  _lte?: string | null | undefined;
  _neq?: string | null | undefined;
  /** does the column NOT match the given case-insensitive pattern */
  _nilike?: string | null | undefined;
  _nin?: Array<string> | null | undefined;
  /** does the column NOT match the given POSIX regular expression, case insensitive */
  _niregex?: string | null | undefined;
  /** does the column NOT match the given pattern */
  _nlike?: string | null | undefined;
  /** does the column NOT match the given POSIX regular expression, case sensitive */
  _nregex?: string | null | undefined;
  /** does the column NOT match the given SQL regular expression */
  _nsimilar?: string | null | undefined;
  /** does the column match the given POSIX regular expression, case sensitive */
  _regex?: string | null | undefined;
  /** does the column match the given SQL regular expression */
  _similar?: string | null | undefined;
};

/** Boolean expression to filter rows from the table "VaultPayoutFallback". All fields are combined with a logical 'AND'. */
export type VaultPayoutFallback_Bool_Exp = {
  _and?: Array<VaultPayoutFallback_Bool_Exp> | null | undefined;
  _not?: VaultPayoutFallback_Bool_Exp | null | undefined;
  _or?: Array<VaultPayoutFallback_Bool_Exp> | null | undefined;
  amount?: Numeric_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  market?: Market_Bool_Exp | null | undefined;
  market_id?: String_Comparison_Exp | null | undefined;
  owner?: String_Comparison_Exp | null | undefined;
  timestamp?: Numeric_Comparison_Exp | null | undefined;
  token?: String_Comparison_Exp | null | undefined;
  txHash?: String_Comparison_Exp | null | undefined;
};

/** Ordering options when selecting data from "VaultPayoutFallback". */
export type VaultPayoutFallback_Order_By = {
  amount?: Order_By | null | undefined;
  id?: Order_By | null | undefined;
  market?: Market_Order_By | null | undefined;
  market_id?: Order_By | null | undefined;
  owner?: Order_By | null | undefined;
  timestamp?: Order_By | null | undefined;
  token?: Order_By | null | undefined;
  txHash?: Order_By | null | undefined;
};

export type Venue_Aggregate_Bool_Exp = {
  bool_and?: Venue_Aggregate_Bool_Exp_Bool_And | null | undefined;
  bool_or?: Venue_Aggregate_Bool_Exp_Bool_Or | null | undefined;
  count?: Venue_Aggregate_Bool_Exp_Count | null | undefined;
};

export type Venue_Aggregate_Bool_Exp_Bool_And = {
  arguments: Venue_Select_Column_Venue_Aggregate_Bool_Exp_Bool_And_Arguments_Columns;
  distinct?: boolean | null | undefined;
  filter?: Venue_Bool_Exp | null | undefined;
  predicate: Boolean_Comparison_Exp;
};

export type Venue_Aggregate_Bool_Exp_Bool_Or = {
  arguments: Venue_Select_Column_Venue_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns;
  distinct?: boolean | null | undefined;
  filter?: Venue_Bool_Exp | null | undefined;
  predicate: Boolean_Comparison_Exp;
};

export type Venue_Aggregate_Bool_Exp_Count = {
  arguments?: Array<Venue_Select_Column> | null | undefined;
  distinct?: boolean | null | undefined;
  filter?: Venue_Bool_Exp | null | undefined;
  predicate: Int_Comparison_Exp;
};

/** Boolean expression to filter rows from the table "Venue". All fields are combined with a logical 'AND'. */
export type Venue_Bool_Exp = {
  _and?: Array<Venue_Bool_Exp> | null | undefined;
  _not?: Venue_Bool_Exp | null | undefined;
  _or?: Array<Venue_Bool_Exp> | null | undefined;
  builderFeesCollected?: Numeric_Comparison_Exp | null | undefined;
  context?: String_Comparison_Exp | null | undefined;
  createdAtBlock?: Numeric_Comparison_Exp | null | undefined;
  createdAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  creationEnabled?: Boolean_Comparison_Exp | null | undefined;
  cumulativeQuoteVolume?: Numeric_Comparison_Exp | null | undefined;
  feeParams?: String_Comparison_Exp | null | undefined;
  feeRecipientOverride?: String_Comparison_Exp | null | undefined;
  id?: String_Comparison_Exp | null | undefined;
  marketCount?: Int_Comparison_Exp | null | undefined;
  marketType?: String_Comparison_Exp | null | undefined;
  operator?: Operator_Bool_Exp | null | undefined;
  operatorId?: Int_Comparison_Exp | null | undefined;
  operator_id?: String_Comparison_Exp | null | undefined;
  policy?: String_Comparison_Exp | null | undefined;
  protocolFeesCollected?: Numeric_Comparison_Exp | null | undefined;
  settlementFeesCollected?: Numeric_Comparison_Exp | null | undefined;
  signer?: String_Comparison_Exp | null | undefined;
  updatedAtBlock?: Numeric_Comparison_Exp | null | undefined;
  updatedAtTimestamp?: Numeric_Comparison_Exp | null | undefined;
  venueId?: String_Comparison_Exp | null | undefined;
};

/** select columns of table "Venue" */
export type Venue_Select_Column =
  /** column name */
  | 'builderFeesCollected'
  /** column name */
  | 'context'
  /** column name */
  | 'createdAtBlock'
  /** column name */
  | 'createdAtTimestamp'
  /** column name */
  | 'creationEnabled'
  /** column name */
  | 'cumulativeQuoteVolume'
  /** column name */
  | 'feeParams'
  /** column name */
  | 'feeRecipientOverride'
  /** column name */
  | 'id'
  /** column name */
  | 'marketCount'
  /** column name */
  | 'marketType'
  /** column name */
  | 'operatorId'
  /** column name */
  | 'operator_id'
  /** column name */
  | 'policy'
  /** column name */
  | 'protocolFeesCollected'
  /** column name */
  | 'settlementFeesCollected'
  /** column name */
  | 'signer'
  /** column name */
  | 'updatedAtBlock'
  /** column name */
  | 'updatedAtTimestamp'
  /** column name */
  | 'venueId';

/** select "Venue_aggregate_bool_exp_bool_and_arguments_columns" columns of table "Venue" */
export type Venue_Select_Column_Venue_Aggregate_Bool_Exp_Bool_And_Arguments_Columns =
  /** column name */
  | 'creationEnabled';

/** select "Venue_aggregate_bool_exp_bool_or_arguments_columns" columns of table "Venue" */
export type Venue_Select_Column_Venue_Aggregate_Bool_Exp_Bool_Or_Arguments_Columns =
  /** column name */
  | 'creationEnabled';

/** Boolean expression to compare columns of type "clobfillkind". All fields are combined with logical 'AND'. */
export type Clobfillkind_Comparison_Exp = {
  _eq?: BinaryFillKind | null | undefined;
  _gt?: BinaryFillKind | null | undefined;
  _gte?: BinaryFillKind | null | undefined;
  _in?: Array<BinaryFillKind> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: BinaryFillKind | null | undefined;
  _lte?: BinaryFillKind | null | undefined;
  _neq?: BinaryFillKind | null | undefined;
  _nin?: Array<BinaryFillKind> | null | undefined;
};

/** Boolean expression to compare columns of type "clobmarketstatus". All fields are combined with logical 'AND'. */
export type Clobmarketstatus_Comparison_Exp = {
  _eq?: BinaryMarketStatus | null | undefined;
  _gt?: BinaryMarketStatus | null | undefined;
  _gte?: BinaryMarketStatus | null | undefined;
  _in?: Array<BinaryMarketStatus> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: BinaryMarketStatus | null | undefined;
  _lte?: BinaryMarketStatus | null | undefined;
  _neq?: BinaryMarketStatus | null | undefined;
  _nin?: Array<BinaryMarketStatus> | null | undefined;
};

/** Boolean expression to compare columns of type "cloborderside". All fields are combined with logical 'AND'. */
export type Cloborderside_Comparison_Exp = {
  _eq?: BinarySide | null | undefined;
  _gt?: BinarySide | null | undefined;
  _gte?: BinarySide | null | undefined;
  _in?: Array<BinarySide> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: BinarySide | null | undefined;
  _lte?: BinarySide | null | undefined;
  _neq?: BinarySide | null | undefined;
  _nin?: Array<BinarySide> | null | undefined;
};

/** Boolean expression to compare columns of type "markettype". All fields are combined with logical 'AND'. */
export type Markettype_Comparison_Exp = {
  _eq?: MarketType | null | undefined;
  _gt?: MarketType | null | undefined;
  _gte?: MarketType | null | undefined;
  _in?: Array<MarketType> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: MarketType | null | undefined;
  _lte?: MarketType | null | undefined;
  _neq?: MarketType | null | undefined;
  _nin?: Array<MarketType> | null | undefined;
};

/** Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'. */
export type Numeric_Comparison_Exp = {
  _eq?: string | null | undefined;
  _gt?: string | null | undefined;
  _gte?: string | null | undefined;
  _in?: Array<string> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: string | null | undefined;
  _lte?: string | null | undefined;
  _neq?: string | null | undefined;
  _nin?: Array<string> | null | undefined;
};

/** column ordering options */
export type Order_By =
  /** in ascending order, nulls last */
  | 'asc'
  /** in ascending order, nulls first */
  | 'asc_nulls_first'
  /** in ascending order, nulls last */
  | 'asc_nulls_last'
  /** in descending order, nulls first */
  | 'desc'
  /** in descending order, nulls first */
  | 'desc_nulls_first'
  /** in descending order, nulls last */
  | 'desc_nulls_last';

/** Boolean expression to compare columns of type "orderstatus". All fields are combined with logical 'AND'. */
export type Orderstatus_Comparison_Exp = {
  _eq?: OrderStatus | null | undefined;
  _gt?: OrderStatus | null | undefined;
  _gte?: OrderStatus | null | undefined;
  _in?: Array<OrderStatus> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: OrderStatus | null | undefined;
  _lte?: OrderStatus | null | undefined;
  _neq?: OrderStatus | null | undefined;
  _nin?: Array<OrderStatus> | null | undefined;
};

/** Boolean expression to compare columns of type "perppositionchangekind". All fields are combined with logical 'AND'. */
export type Perppositionchangekind_Comparison_Exp = {
  _eq?: PerpPositionChangeKind | null | undefined;
  _gt?: PerpPositionChangeKind | null | undefined;
  _gte?: PerpPositionChangeKind | null | undefined;
  _in?: Array<PerpPositionChangeKind> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: PerpPositionChangeKind | null | undefined;
  _lte?: PerpPositionChangeKind | null | undefined;
  _neq?: PerpPositionChangeKind | null | undefined;
  _nin?: Array<PerpPositionChangeKind> | null | undefined;
};

/** Boolean expression to compare columns of type "stoporderstatus". All fields are combined with logical 'AND'. */
export type Stoporderstatus_Comparison_Exp = {
  _eq?: StopOrderStatus | null | undefined;
  _gt?: StopOrderStatus | null | undefined;
  _gte?: StopOrderStatus | null | undefined;
  _in?: Array<StopOrderStatus> | null | undefined;
  _is_null?: boolean | null | undefined;
  _lt?: StopOrderStatus | null | undefined;
  _lte?: StopOrderStatus | null | undefined;
  _neq?: StopOrderStatus | null | undefined;
  _nin?: Array<StopOrderStatus> | null | undefined;
};

export type SnapshotVersionQueryVariables = Exact<{
  capabilityId: string;
  guardId: string;
}>;


export type SnapshotVersionQuery = { capability: { id: string, chainId: number, capability: string, contractVersion: number, datasetGeneration: string, manifestDigest: string, changeStartBlock: number, readiness: AccountCapabilityReadiness, unavailableReason: string | null, orderCapacity: number, stopCapacity: number, retentionBatches: number, publicRoleMaxRows: number | null, publicRoleMaxResponseBytes: number | null } | null, guard: { id: string, account: string, datasetGeneration: string, blockNumber: string, blockHash: string, digest: string } | null };

export type AccountOrderRowFragment = { id: string, market_id: string, orderId: string, orderIdRaw: string, owner: string, isBid: boolean, side: BinarySide | null, userData: string, price: string, fullQuantity: string, quantityRemaining: string, filledQuantity: string, expireTimestampNs: string, status: OrderStatus, rested: boolean, cancelReason: string | null, amendedFromOrderId: string | null, amendedToOrderId: string | null, placedAtBlock: string, placedAtTimestamp: string, placedTxHash: string, lastUpdatedAtBlock: string, lastUpdatedAtTimestamp: string };

export type AccountOrderRowsQueryVariables = Exact<{
  account: string;
  chainId: number;
  orderLimit: number;
  stopLimit: number;
  nowNs: string;
}>;


export type AccountOrderRowsQuery = { watermark: Array<{ latest_processed_block: number | null }>, ordersWithoutExpiry: Array<{ id: string, market_id: string, orderId: string, orderIdRaw: string, owner: string, isBid: boolean, side: BinarySide | null, userData: string, price: string, fullQuantity: string, quantityRemaining: string, filledQuantity: string, expireTimestampNs: string, status: OrderStatus, rested: boolean, cancelReason: string | null, amendedFromOrderId: string | null, amendedToOrderId: string | null, placedAtBlock: string, placedAtTimestamp: string, placedTxHash: string, lastUpdatedAtBlock: string, lastUpdatedAtTimestamp: string }>, ordersWithExpiry: Array<{ id: string, market_id: string, orderId: string, orderIdRaw: string, owner: string, isBid: boolean, side: BinarySide | null, userData: string, price: string, fullQuantity: string, quantityRemaining: string, filledQuantity: string, expireTimestampNs: string, status: OrderStatus, rested: boolean, cancelReason: string | null, amendedFromOrderId: string | null, amendedToOrderId: string | null, placedAtBlock: string, placedAtTimestamp: string, placedTxHash: string, lastUpdatedAtBlock: string, lastUpdatedAtTimestamp: string }>, stops: Array<{ id: string, registry: string, market_id: string, orderIdRaw: string, owner: string, isBid: boolean, quantity: string, triggerPrice: string, triggerOperator: number, orderType: number, builder: string, builderFeeBpsTimes1k: string, status: StopOrderStatus, placedOrderId: string | null, dropReason: number | null, siblingOrderId: string | null, intent: number | null, cancelReason: string | null, createdAt: string, updatedAt: string, txHash: string }> };

export type OutcomePositionsSnapshotVersionQueryVariables = Exact<{
  capabilityId: string;
  guardId: string;
}>;


export type OutcomePositionsSnapshotVersionQuery = { capability: { id: string, chainId: number, capability: string, contractVersion: number, datasetGeneration: string, manifestDigest: string, changeStartBlock: number, readiness: AccountCapabilityReadiness, unavailableReason: string | null, positionCapacity: number, publicRoleMaxRows: number | null, publicRoleMaxResponseBytes: number | null, indexedFields: Array<string>, indexedWhenPresentFields: Array<string>, enrichmentFields: Array<string> } | null, guard: { id: string, account: string, datasetGeneration: string, blockNumber: string, blockHash: string, digest: string } | null };

export type AccountOutcomePositionRowsQueryVariables = Exact<{
  account: string;
  chainId: number;
  positionLimit: number;
}>;


export type AccountOutcomePositionRowsQuery = { watermark: Array<{ latest_processed_block: number | null }>, positions: Array<{ id: string, market_id: string, account: string, outcomeIndex: number, tokenId: string, balance: string, updatedAtBlock: number, market: { clobStatus: BinaryMarketStatus | null, tradingStart: string | null, expiry: string | null, voided: boolean, finalized: boolean | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null } | null }> };

export type AccountCapabilityWatchSubscriptionVariables = Exact<{
  capabilityId: string;
}>;


export type AccountCapabilityWatchSubscription = { capability: { id: string, chainId: number, capability: string, contractVersion: number, datasetGeneration: string, manifestDigest: string, changeStartBlock: number, readiness: AccountCapabilityReadiness, unavailableReason: string | null, orderCapacity: number, stopCapacity: number, retentionBatches: number, publicRoleMaxRows: number | null, publicRoleMaxResponseBytes: number | null } | null };

export type AccountGuardWatchSubscriptionVariables = Exact<{
  guardId: string;
}>;


export type AccountGuardWatchSubscription = { guard: { id: string, account: string, datasetGeneration: string, blockNumber: string, blockHash: string, digest: string } | null };

export type AccountChangeBatchStreamSubscriptionVariables = Exact<{
  account: string;
  datasetGeneration: string;
  afterBlock: string;
  batchSize: number;
}>;


export type AccountChangeBatchStreamSubscription = { batches: Array<{ id: string, account: string, datasetGeneration: string, blockNumber: string, blockHash: string, digest: string, predecessorBlockNumber: string | null, predecessorBlockHash: string | null, predecessorDigest: string | null, orderChangeCount: number, stopChangeCount: number, overflow: boolean }> };

export type AccountChangeChildrenQueryVariables = Exact<{
  batchIds: Array<string> | string;
  orderChildLimit: number;
  stopChildLimit: number;
}>;


export type AccountChangeChildrenQuery = { orderChanges: Array<{ id: string, batch_id: string, account: string, datasetGeneration: string, blockNumber: string, operation: AccountChangeOperation, physicalEntityId: string, terminalCause: string | null, market_id: string, orderId: string, orderIdRaw: string, isBid: boolean | null, side: BinarySide | null, userData: string | null, price: string | null, fullQuantity: string | null, quantityRemaining: string | null, filledQuantity: string | null, expireTimestampNs: string | null, status: OrderStatus | null, rested: boolean | null, cancelReason: string | null, amendedFromOrderId: string | null, amendedToOrderId: string | null, placedAtBlock: string | null, placedAtTimestamp: string | null, placedTxHash: string | null, lastUpdatedAtBlock: string | null, lastUpdatedAtTimestamp: string | null }>, stopChanges: Array<{ id: string, batch_id: string, account: string, datasetGeneration: string, blockNumber: string, operation: AccountChangeOperation, physicalEntityId: string, terminalCause: string | null, registry: string | null, market_id: string, orderIdRaw: string, isBid: boolean | null, quantity: string | null, triggerPrice: string | null, triggerOperator: number | null, orderType: number | null, builder: string | null, builderFeeBpsTimes1k: string | null, status: StopOrderStatus | null, placedOrderId: string | null, dropReason: number | null, siblingOrderId: string | null, intent: number | null, cancelReason: string | null, createdAt: string | null, updatedAt: string | null, txHash: string | null }> };

export type ActivityFillFieldsFragment = { id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, takerIsBid: boolean | null, blockNumber: string, timestamp: string, txHash: string, market: string, takerOrder: { owner: string, side: BinarySide | null } | null };

export type ActivityRouterFieldsFragment = { id: string, kind: string, account: string, amount: string, payout: string | null, routedVia: string | null, blockNumber: string, timestamp: string, txHash: string, market: string };

export type ActivityResolutionFieldsFragment = { id: string, kind: string, outcomeIdx: number | null, voided: boolean | null, blockNumber: string, timestamp: string, txHash: string, market: string };

export type ActivityStatusFieldsFragment = { id: string, oldStatus: BinaryMarketStatus, newStatus: BinaryMarketStatus, blockNumber: string, timestamp: string, txHash: string, market: string };

export type MarketActivityQueryVariables = Exact<{
  fillWhere: Fill_Bool_Exp;
  routerWhere: RouterActionRecord_Bool_Exp;
  resolutionWhere: MarketResolutionEvent_Bool_Exp;
  statusWhere: MarketStatusUpdate_Bool_Exp;
  fillLimit: number;
  routerLimit: number;
  resolutionLimit: number;
  statusLimit: number;
}>;


export type MarketActivityQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, takerIsBid: boolean | null, blockNumber: string, timestamp: string, txHash: string, market: string, takerOrder: { owner: string, side: BinarySide | null } | null }>, RouterActionRecord: Array<{ id: string, kind: string, account: string, amount: string, payout: string | null, routedVia: string | null, blockNumber: string, timestamp: string, txHash: string, market: string }>, MarketResolutionEvent: Array<{ id: string, kind: string, outcomeIdx: number | null, voided: boolean | null, blockNumber: string, timestamp: string, txHash: string, market: string }>, MarketStatusUpdate: Array<{ id: string, oldStatus: BinaryMarketStatus, newStatus: BinaryMarketStatus, blockNumber: string, timestamp: string, txHash: string, market: string }> };

export type TransactionOrderFieldsFragment = { id: string, orderId: string, market_id: string, owner: string, isBid: boolean, side: BinarySide | null, price: string, fullQuantity: string, filledQuantity: string, quantityRemaining: string, status: OrderStatus, rested: boolean, cancelReason: string | null, placedAtTimestamp: string, placedTxHash: string };

export type TransactionEventsQueryVariables = Exact<{
  txHash: string;
  limit: number;
}>;


export type TransactionEventsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, takerIsBid: boolean | null, blockNumber: string, timestamp: string, txHash: string, market: string, takerOrder: { owner: string, side: BinarySide | null } | null }>, RouterActionRecord: Array<{ id: string, kind: string, account: string, amount: string, payout: string | null, routedVia: string | null, blockNumber: string, timestamp: string, txHash: string, market: string }>, MarketResolutionEvent: Array<{ id: string, kind: string, outcomeIdx: number | null, voided: boolean | null, blockNumber: string, timestamp: string, txHash: string, market: string }>, MarketStatusUpdate: Array<{ id: string, oldStatus: BinaryMarketStatus, newStatus: BinaryMarketStatus, blockNumber: string, timestamp: string, txHash: string, market: string }> };

export type TransactionOrderAnchorQueryVariables = Exact<{
  txHash: string;
  limit: number;
}>;


export type TransactionOrderAnchorQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Order: Array<{ placedAtBlock: string, id: string, orderId: string, market_id: string, owner: string, isBid: boolean, side: BinarySide | null, price: string, fullQuantity: string, filledQuantity: string, quantityRemaining: string, status: OrderStatus, rested: boolean, cancelReason: string | null, placedAtTimestamp: string, placedTxHash: string }> };

export type TransactionContextQueryVariables = Exact<{
  txHash: string;
  timestamp: string;
  marketIds: Array<string> | string;
  limit: number;
  orderLimit: number;
}>;


export type TransactionContextQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Order: Array<{ id: string, orderId: string, market_id: string, owner: string, isBid: boolean, side: BinarySide | null, price: string, fullQuantity: string, filledQuantity: string, quantityRemaining: string, status: OrderStatus, rested: boolean, cancelReason: string | null, placedAtTimestamp: string, placedTxHash: string }>, ProtocolFeeRecord: Array<{ id: string, orderId: string, recipient: string, payer: string | null, token: string, amount: string, isTakerSide: boolean, pool: string, timestamp: string, txHash: string, market: string }>, BuilderFeeRecord: Array<{ id: string, orderId: string, builder: string, payer: string | null, token: string, amount: string, pool: string, timestamp: string, txHash: string, market: string }>, Market: Array<{ id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null }> };

export type BlockOrderFieldsFragment = { id: string, orderId: string, market_id: string, owner: string, isBid: boolean, side: BinarySide | null, price: string, fullQuantity: string, cancelReason: string | null, placedAtBlock: string, placedTxHash: string };

export type BlockActivityQueryVariables = Exact<{
  ts: string;
  blk: string;
  limit: number;
  offset: number;
}>;


export type BlockActivityQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ makerOrder_id: string, takerOrder_id: string, id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, takerIsBid: boolean | null, blockNumber: string, timestamp: string, txHash: string, market: string, takerOrder: { owner: string, side: BinarySide | null } | null }>, placed: Array<{ id: string, orderId: string, market_id: string, owner: string, isBid: boolean, side: BinarySide | null, price: string, fullQuantity: string, cancelReason: string | null, placedAtBlock: string, placedTxHash: string }>, touched: Array<{ id: string, orderId: string, market_id: string, owner: string, isBid: boolean, side: BinarySide | null, price: string, fullQuantity: string, cancelReason: string | null, placedAtBlock: string, placedTxHash: string }> };

export type BlockMarketsQueryVariables = Exact<{
  marketIds: Array<string> | string;
}>;


export type BlockMarketsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null }> };

export type LatestActiveTimestampQueryVariables = Exact<{ [key: string]: never; }>;


export type LatestActiveTimestampQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ timestamp: string }>, placed: Array<{ placedAtTimestamp: string }>, touched: Array<{ lastUpdatedAtTimestamp: string }> };

export type ActiveBlocksAtTimestampQueryVariables = Exact<{
  ts: string;
}>;


export type ActiveBlocksAtTimestampQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ blockNumber: string }>, placed: Array<{ placedAtBlock: string }>, touched: Array<{ lastUpdatedAtBlock: string }> };

export type AdjacentActiveBlocksQueryVariables = Exact<{
  ts: string;
  limit: number;
}>;


export type AdjacentActiveBlocksQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, prevFill: Array<{ blockNumber: string }>, nextFill: Array<{ blockNumber: string }>, prevPlaced: Array<{ placedAtBlock: string }>, nextPlaced: Array<{ placedAtBlock: string }>, prevTouched: Array<{ lastUpdatedAtBlock: string }>, nextTouched: Array<{ lastUpdatedAtBlock: string }> };

export type PortfolioMarketFieldsFragment = { id: string, marketAddress: string | null, poolAddress: string, asset: string | null, question: string | null, lastPrice: string | null, strike: string | null, expiry: string | null, winningOutcome: number | null, voided: boolean, payoutNumerators: Array<string> | null, payoutDenominator: string | null, quoteDecimals: number, intervalSec: string | null, status: BinaryMarketStatus | null };

export type PortfolioQueryVariables = Exact<{
  acct: string;
  fillWhere: Fill_Bool_Exp;
  orderWhere: Order_Bool_Exp;
  ordersLimit?: number | null | undefined;
  tradesLimit?: number | null | undefined;
  positionsLimit: number;
  positionsOffset: number;
}>;


export type PortfolioQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OutcomeBalance: Array<{ outcomeIndex: number, tokenId: string, balance: string, market: { id: string, marketAddress: string | null, poolAddress: string, asset: string | null, question: string | null, lastPrice: string | null, strike: string | null, expiry: string | null, winningOutcome: number | null, voided: boolean, payoutNumerators: Array<string> | null, payoutDenominator: string | null, quoteDecimals: number, intervalSec: string | null, status: BinaryMarketStatus | null } | null }>, ClobOrder: Array<{ id: string, orderId: string, side: BinarySide | null, price: string, quantityRemaining: string, filledQuantity: string, fullQuantity: string, placedAtTimestamp: string, placedTxHash: string, market: { id: string, marketAddress: string | null, poolAddress: string, asset: string | null, question: string | null, lastPrice: string | null, strike: string | null, expiry: string | null, winningOutcome: number | null, voided: boolean, payoutNumerators: Array<string> | null, payoutDenominator: string | null, quoteDecimals: number, intervalSec: string | null, status: BinaryMarketStatus | null } | null }>, ClobFill: Array<{ id: string, fillPrice: string, quantity: string, timestamp: string, txHash: string, maker: string | null, makerSide: BinarySide | null, takerOrder: { owner: string, side: BinarySide | null } | null, market: { marketAddress: string | null, asset: string | null, quoteDecimals: number } | null }> };

export type OutcomeBalancesQueryVariables = Exact<{
  acct: string;
  mkt: string;
}>;


export type OutcomeBalancesQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OutcomeBalance: Array<{ outcomeIndex: number, balance: string }> };

export type VaultPayoutFallbacksQueryVariables = Exact<{
  where: VaultPayoutFallback_Bool_Exp;
  orderBy?: Array<VaultPayoutFallback_Order_By> | VaultPayoutFallback_Order_By | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type VaultPayoutFallbacksQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, VaultPayoutFallback: Array<{ id: string, owner: string, token: string, amount: string, timestamp: string, txHash: string, marketId: string, market: { poolAddress: string } | null }> };

export type MarketResolutionQueryVariables = Exact<{
  id: string;
}>;


export type MarketResolutionQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, MarketResolutionEvent: Array<{ id: string, kind: string, payoutNumerators: Array<string> | null, payoutDenominator: string | null, voided: boolean | null, blockNumber: string, timestamp: string, txHash: string, market: string, winningOutcome: number | null }>, MarketReferenceLink: Array<{ id: string, pending: boolean, blockNumber: string, timestamp: string, market: string, oracleQuestionId: string }>, Market_by_pk: { oracleQuestionId: string | null } | null };

export type OracleAnswersQueryVariables = Exact<{
  closingQid: string;
  openingQid: string;
}>;


export type OracleAnswersQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, closing: { oracleQuestionId: string, numericValue: string | null, outcomeLabel: string | null, voidReason: number | null, resolvedAt: string | null, txHash: string | null } | null, opening: { oracleQuestionId: string, numericValue: string | null, outcomeLabel: string | null, voidReason: number | null, resolvedAt: string | null, txHash: string | null } | null };

export type MarketResolutionEventsQueryVariables = Exact<{
  where: MarketResolutionEvent_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type MarketResolutionEventsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, MarketResolutionEvent: Array<{ id: string, kind: string, payoutNumerators: Array<string> | null, payoutDenominator: string | null, voided: boolean | null, blockNumber: string, timestamp: string, txHash: string, market: string, winningOutcome: number | null }> };

export type MarketReferenceLinksQueryVariables = Exact<{
  where: MarketReferenceLink_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type MarketReferenceLinksQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, MarketReferenceLink: Array<{ id: string, pending: boolean, blockNumber: string, timestamp: string, market: string, oracleQuestionId: string }> };

export type CandlesQueryVariables = Exact<{
  where: Candle_Bool_Exp;
  limit?: number | null | undefined;
}>;


export type CandlesQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Candle: Array<{ bucketStart: string, openPrice: string, high: string, low: string, closePrice: string, baseVolume: string, quoteVolume: string, tradeCount: number, lastFillId: string }> };

export type ProtocolFeeFieldsFragment = { id: string, orderId: string, recipient: string, payer: string | null, token: string, amount: string, isTakerSide: boolean, pool: string, timestamp: string, txHash: string, market: string };

export type BuilderFeeFieldsFragment = { id: string, orderId: string, builder: string, payer: string | null, token: string, amount: string, pool: string, timestamp: string, txHash: string, market: string };

export type SettlementFeeFieldsFragment = { id: string, winningBacking: string, timestamp: string, txHash: string, recipient: string, amount: string, market: string };

export type BuilderApprovalsQueryVariables = Exact<{
  where: BuilderApproval_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type BuilderApprovalsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, BuilderApproval: Array<{ id: string, market_id: string, user: string, builder: string, maxFeeBpsTimes1k: string, blockNumber: string, timestamp: string, txHash: string, market: { poolAddress: string } | null }> };

export type ProtocolFeesQueryVariables = Exact<{
  where: ProtocolFeeRecord_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type ProtocolFeesQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, ProtocolFeeRecord: Array<{ id: string, orderId: string, recipient: string, payer: string | null, token: string, amount: string, isTakerSide: boolean, pool: string, timestamp: string, txHash: string, market: string }> };

export type BuilderFeesQueryVariables = Exact<{
  where: BuilderFeeRecord_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type BuilderFeesQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, BuilderFeeRecord: Array<{ id: string, orderId: string, builder: string, payer: string | null, token: string, amount: string, pool: string, timestamp: string, txHash: string, market: string }> };

export type SettlementFeesQueryVariables = Exact<{
  where: SettlementFeeRecord_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type SettlementFeesQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, SettlementFeeRecord: Array<{ id: string, winningBacking: string, timestamp: string, txHash: string, recipient: string, amount: string, market: string }> };

export type FillQueryFieldsFragment = { blockNumber: string, logIndex: number, id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, kind: BinaryFillKind | null, takerIsBid: boolean | null, makerOrderId: string, takerOrderId: string, takerRemainingQuantity: string, makerRemainingQuantity: string, timestamp: string, txHash: string, market: string, takerOrder: { owner: string, side: BinarySide | null } | null };

export type FillsQueryVariables = Exact<{
  where: Fill_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type FillsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ blockNumber: string, logIndex: number, id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, kind: BinaryFillKind | null, takerIsBid: boolean | null, makerOrderId: string, takerOrderId: string, takerRemainingQuantity: string, makerRemainingQuantity: string, timestamp: string, txHash: string, market: string, takerOrder: { owner: string, side: BinarySide | null } | null }> };

export type UserFillsQueryVariables = Exact<{
  where: Fill_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type UserFillsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ blockNumber: string, logIndex: number, id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, kind: BinaryFillKind | null, takerIsBid: boolean | null, makerOrderId: string, takerOrderId: string, takerRemainingQuantity: string, makerRemainingQuantity: string, timestamp: string, txHash: string, market: string, takerOrder: { owner: string, side: BinarySide | null } | null }> };

export type FillsRangePageQueryVariables = Exact<{
  where: Fill_Bool_Exp;
  limit: number;
}>;


export type FillsRangePageQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ blockNumber: string, logIndex: number, id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, kind: BinaryFillKind | null, takerIsBid: boolean | null, makerOrderId: string, takerOrderId: string, takerRemainingQuantity: string, makerRemainingQuantity: string, timestamp: string, txHash: string, market: string, takerOrder: { owner: string, side: BinarySide | null } | null }> };

export type LatestFillBlockQueryVariables = Exact<{
  marketType: MarketType;
}>;


export type LatestFillBlockQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ blockNumber: string, timestamp: string }> };

export type UserFillsPageQueryVariables = Exact<{
  where: Fill_Bool_Exp;
  limit: number;
}>;


export type UserFillsPageQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, FillDataset_by_pk: { generation: string } | null, Fill: Array<{ blockNumber: string, logIndex: number, id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, kind: BinaryFillKind | null, takerIsBid: boolean | null, makerOrderId: string, takerOrderId: string, takerRemainingQuantity: string, makerRemainingQuantity: string, timestamp: string, txHash: string, market: string, takerOrder: { owner: string, side: BinarySide | null } | null }> };

export type MarketRefFieldsFragment = { id: string, marketType: MarketType, poolAddress: string, marketAddress: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseDecimals: number, quoteDecimals: number, asset: string | null, question: string | null };

export type FillDetailQueryVariables = Exact<{
  id: string;
}>;


export type FillDetailQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ blockNumber: string, logIndex: number, id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, kind: BinaryFillKind | null, takerIsBid: boolean | null, makerOrderId: string, takerOrderId: string, takerRemainingQuantity: string, makerRemainingQuantity: string, timestamp: string, txHash: string, market: string, marketRef: { id: string, marketType: MarketType, poolAddress: string, marketAddress: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseDecimals: number, quoteDecimals: number, asset: string | null, question: string | null } | null, takerOrder: { owner: string, side: BinarySide | null } | null }> };

export type OrderFillsQueryVariables = Exact<{
  pool: string;
  oid: string;
  limit?: number | null | undefined;
}>;


export type OrderFillsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ blockNumber: string, logIndex: number, id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, kind: BinaryFillKind | null, takerIsBid: boolean | null, makerOrderId: string, takerOrderId: string, takerRemainingQuantity: string, makerRemainingQuantity: string, timestamp: string, txHash: string, market: string, takerOrder: { owner: string, side: BinarySide | null } | null }> };

export type TradeContextFillFieldsFragment = { id: string, market_id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, kind: BinaryFillKind | null, takerIsBid: boolean | null, makerOrderId: string, takerOrderId: string, takerRemainingQuantity: string, makerRemainingQuantity: string, blockNumber: string, timestamp: string, logIndex: number, txHash: string, takerOrder: { owner: string, side: BinarySide | null } | null };

export type FillOrderFieldsFragment = { id: string, orderId: string, owner: string, isBid: boolean, side: BinarySide | null, price: string, fullQuantity: string, filledQuantity: string, quantityRemaining: string, status: OrderStatus, rested: boolean, cancelReason: string | null, placedAtTimestamp: string, placedTxHash: string };

export type TradeContextQueryVariables = Exact<{
  id: string;
}>;


export type TradeContextQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill_by_pk: { id: string, market_id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, kind: BinaryFillKind | null, takerIsBid: boolean | null, makerOrderId: string, takerOrderId: string, takerRemainingQuantity: string, makerRemainingQuantity: string, blockNumber: string, timestamp: string, logIndex: number, txHash: string, market: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, makerOrder: { id: string, orderId: string, owner: string, isBid: boolean, side: BinarySide | null, price: string, fullQuantity: string, filledQuantity: string, quantityRemaining: string, status: OrderStatus, rested: boolean, cancelReason: string | null, placedAtTimestamp: string, placedTxHash: string } | null, takerOrder: { owner: string, side: BinarySide | null, id: string, orderId: string, isBid: boolean, price: string, fullQuantity: string, filledQuantity: string, quantityRemaining: string, status: OrderStatus, rested: boolean, cancelReason: string | null, placedAtTimestamp: string, placedTxHash: string } | null } | null };

export type FillTxContextQueryVariables = Exact<{
  timestamp: string;
  txHash: string;
  market: string;
  id: string;
}>;


export type FillTxContextQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Fill: Array<{ id: string, market_id: string, pool: string, fillPrice: string, quantity: string, quoteQuantity: string, maker: string | null, makerSide: BinarySide | null, taker: string | null, takerSide: BinarySide | null, kind: BinaryFillKind | null, takerIsBid: boolean | null, makerOrderId: string, takerOrderId: string, takerRemainingQuantity: string, makerRemainingQuantity: string, blockNumber: string, timestamp: string, logIndex: number, txHash: string, takerOrder: { owner: string, side: BinarySide | null } | null }>, ProtocolFeeRecord: Array<{ id: string, orderId: string, recipient: string, payer: string | null, token: string, amount: string, isTakerSide: boolean, pool: string, timestamp: string, txHash: string, market: string }>, BuilderFeeRecord: Array<{ id: string, orderId: string, builder: string, payer: string | null, token: string, amount: string, pool: string, timestamp: string, txHash: string, market: string }> };

export type FillCountQueryVariables = Exact<{
  where: Fill_Bool_Exp;
}>;


export type FillCountQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, total: { aggregate: { count: number } | null } };

export type FillCountFallbackQueryVariables = Exact<{
  where: Fill_Bool_Exp;
  limit: number;
}>;


export type FillCountFallbackQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, rows: Array<{ id: string }> };

export type SeriesFieldsFragment = { id: string, creatorAddress: string, seriesId: number, collateral: string, asset: string, intervalSec: string, createdAtTimestamp: string | null, updatedAtTimestamp: string | null };

export type MarketCreatorFieldsFragment = { id: string, owner: string, policy: string, core: string, adapter: string, operatorId: number, venueId: string, factory: string | null, createdAtBlock: number | null, createdAtTimestamp: string | null };

export type OracleAdapterFieldsFragment = { id: string, owner: string, factory: string | null, approved: boolean, approvedAtTimestamp: string | null, createdAtTimestamp: string | null };

export type MarketCreatorsQueryVariables = Exact<{
  where: MarketCreator_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type MarketCreatorsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, MarketCreator: Array<{ id: string, owner: string, policy: string, core: string, adapter: string, operatorId: number, venueId: string, factory: string | null, createdAtBlock: number | null, createdAtTimestamp: string | null, series: Array<{ id: string, creatorAddress: string, seriesId: number, collateral: string, asset: string, intervalSec: string, createdAtTimestamp: string | null, updatedAtTimestamp: string | null }> }> };

export type MarketCreatorByPkQueryVariables = Exact<{
  id: string;
}>;


export type MarketCreatorByPkQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, MarketCreator_by_pk: { id: string, owner: string, policy: string, core: string, adapter: string, operatorId: number, venueId: string, factory: string | null, createdAtBlock: number | null, createdAtTimestamp: string | null, series: Array<{ id: string, creatorAddress: string, seriesId: number, collateral: string, asset: string, intervalSec: string, createdAtTimestamp: string | null, updatedAtTimestamp: string | null }> } | null };

export type OracleAdaptersQueryVariables = Exact<{
  where: OracleAdapter_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type OracleAdaptersQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OracleAdapter: Array<{ id: string, owner: string, factory: string | null, approved: boolean, approvedAtTimestamp: string | null, createdAtTimestamp: string | null }> };

export type OracleAdapterByPkQueryVariables = Exact<{
  id: string;
}>;


export type OracleAdapterByPkQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OracleAdapter_by_pk: { id: string, owner: string, factory: string | null, approved: boolean, approvedAtTimestamp: string | null, createdAtTimestamp: string | null } | null };

export type SeriesByIdQueryVariables = Exact<{
  id: string;
}>;


export type SeriesByIdQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Series: Array<{ id: string, creatorAddress: string, seriesId: number, collateral: string, asset: string, intervalSec: string, createdAtTimestamp: string | null, updatedAtTimestamp: string | null }> };

export type SeriesListQueryVariables = Exact<{
  where: Series_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type SeriesListQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Series: Array<{ id: string, creatorAddress: string, seriesId: number, collateral: string, asset: string, intervalSec: string, createdAtTimestamp: string | null, updatedAtTimestamp: string | null }> };

export type SeriesLatestMarketsQueryVariables = Exact<{
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type SeriesLatestMarketsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, series_id: string | null, createdAtTimestamp: string }> };

export type MarketFieldsFragment = { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null };

export type RegistryMarketsQueryVariables = Exact<{
  where: Market_Bool_Exp;
  limit?: number | null | undefined;
}>;


export type RegistryMarketsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null }> };

export type ResolvableMarketsQueryVariables = Exact<{
  id0?: string;
  use0?: boolean;
  id1?: string;
  use1?: boolean;
  id2?: string;
  use2?: boolean;
  id3?: string;
  use3?: boolean;
  id4?: string;
  use4?: boolean;
  id5?: string;
  use5?: boolean;
  id6?: string;
  use6?: boolean;
  id7?: string;
  use7?: boolean;
  id8?: string;
  use8?: boolean;
  id9?: string;
  use9?: boolean;
  id10?: string;
  use10?: boolean;
  id11?: string;
  use11?: boolean;
  id12?: string;
  use12?: boolean;
  id13?: string;
  use13?: boolean;
  id14?: string;
  use14?: boolean;
  id15?: string;
  use15?: boolean;
  id16?: string;
  use16?: boolean;
  id17?: string;
  use17?: boolean;
  id18?: string;
  use18?: boolean;
  id19?: string;
  use19?: boolean;
  id20?: string;
  use20?: boolean;
  id21?: string;
  use21?: boolean;
  id22?: string;
  use22?: boolean;
  id23?: string;
  use23?: boolean;
  id24?: string;
  use24?: boolean;
}>;


export type ResolvableMarketsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, market0?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market1?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market2?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market3?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market4?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market5?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market6?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market7?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market8?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market9?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market10?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market11?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market12?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market13?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market14?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market15?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market16?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market17?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market18?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market19?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market20?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market21?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market22?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market23?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null, market24?: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null };

export type MarketsQueryVariables = Exact<{
  where: Market_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type MarketsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null }> };

export type MarketByPkQueryVariables = Exact<{
  id: string;
}>;


export type MarketByPkQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market_by_pk: { id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null } | null };

export type MarketByAddressQueryVariables = Exact<{
  a: string;
}>;


export type MarketByAddressQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null }> };

export type BinaryMarketsQueryVariables = Exact<{
  where: Market_Bool_Exp;
  orderBy?: Array<Market_Order_By> | Market_Order_By | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type BinaryMarketsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null }> };

export type SpotMarketsQueryVariables = Exact<{
  where: Market_Bool_Exp;
  limit?: number | null | undefined;
}>;


export type SpotMarketsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null }> };

export type PerpMarketsQueryVariables = Exact<{
  where: Market_Bool_Exp;
  limit?: number | null | undefined;
}>;


export type PerpMarketsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null }> };

export type LiveBinaryMarketsQueryVariables = Exact<{
  where: Market_Bool_Exp;
  orderBy?: Array<Market_Order_By> | Market_Order_By | null | undefined;
  limit: number;
  offset: number;
}>;


export type LiveBinaryMarketsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null }> };

export type PastBinaryMarketsQueryVariables = Exact<{
  where: Market_Bool_Exp;
  limit: number;
  offset: number;
}>;


export type PastBinaryMarketsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null }> };

export type BinaryOriginPairsQueryVariables = Exact<{ [key: string]: never; }>;


export type BinaryOriginPairsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ operatorId: number | null, venueId: string | null }> };

export type BinaryAssetsQueryVariables = Exact<{ [key: string]: never; }>;


export type BinaryAssetsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ asset: string | null }> };

export type MarketFeesQueryVariables = Exact<{
  id: string;
}>;


export type MarketFeesQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, MarketVenue_by_pk: { operatorId: number, venueId: string, feeRecipient: string | null, makerFeeBps: string | null, takerFeeBps: string | null, maxBuilderFeeBps: string | null, routingFeeBps: string | null, settlementFeeBps: string | null, settlementFeesCollected: string | null } | null };

export type MarketStatusHistoryQueryVariables = Exact<{
  id: string;
}>;


export type MarketStatusHistoryQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, MarketStatusUpdate: Array<{ oldStatus: BinaryMarketStatus, newStatus: BinaryMarketStatus, blockNumber: string, timestamp: string, txHash: string }> };

export type OracleAnswersByQidQueryVariables = Exact<{
  qids?: Array<string> | string | null | undefined;
}>;


export type OracleAnswersByQidQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OracleAnswer: Array<{ id: string, numericValue: string | null, voided: boolean | null }> };

export type ResolutionQidsQueryVariables = Exact<{
  ids?: Array<string> | string | null | undefined;
}>;


export type ResolutionQidsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, oracleQuestionId: string | null }> };

export type OpeningRefsQueryVariables = Exact<{
  ids?: Array<string> | string | null | undefined;
}>;


export type OpeningRefsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, MarketReferenceLink: Array<{ referenceQuestionId: string, market: string }> };

export type MarketCountQueryVariables = Exact<{
  where: Market_Bool_Exp;
}>;


export type MarketCountQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, total: { aggregate: { count: number } | null } };

export type MarketCountFallbackQueryVariables = Exact<{
  where: Market_Bool_Exp;
  limit: number;
}>;


export type MarketCountFallbackQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, rows: Array<{ id: string }> };

export type OperatorFieldsFragment = { operatorId: number, owner: string, feeRecipient: string, enabled: boolean, policy: string, context: string, pendingOwner: string | null, venueCount: number, createdAtTimestamp: string, updatedAtTimestamp: string, updatedAtBlock: string, marketCount: number, cumulativeQuoteVolume: string, protocolFeesCollected: string, settlementFeesCollected: string, builderFeesCollected: string };

export type VenueFieldsFragment = { venueId: string, operatorId: number, marketType: string, feeParams: string, feeRecipientOverride: string, policy: string, signer: string, creationEnabled: boolean, context: string, createdAtTimestamp: string, updatedAtTimestamp: string, updatedAtBlock: string, marketCount: number, cumulativeQuoteVolume: string, protocolFeesCollected: string, settlementFeesCollected: string, builderFeesCollected: string };

export type OperatorsQueryVariables = Exact<{
  where: Operator_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type OperatorsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Operator: Array<{ operatorId: number, owner: string, feeRecipient: string, enabled: boolean, policy: string, context: string, pendingOwner: string | null, venueCount: number, createdAtTimestamp: string, updatedAtTimestamp: string, updatedAtBlock: string, marketCount: number, cumulativeQuoteVolume: string, protocolFeesCollected: string, settlementFeesCollected: string, builderFeesCollected: string }> };

export type OperatorByPkQueryVariables = Exact<{
  id: string;
}>;


export type OperatorByPkQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Operator_by_pk: { operatorId: number, owner: string, feeRecipient: string, enabled: boolean, policy: string, context: string, pendingOwner: string | null, venueCount: number, createdAtTimestamp: string, updatedAtTimestamp: string, updatedAtBlock: string, marketCount: number, cumulativeQuoteVolume: string, protocolFeesCollected: string, settlementFeesCollected: string, builderFeesCollected: string } | null };

export type VenuesQueryVariables = Exact<{
  where: Venue_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type VenuesQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Venue: Array<{ venueId: string, operatorId: number, marketType: string, feeParams: string, feeRecipientOverride: string, policy: string, signer: string, creationEnabled: boolean, context: string, createdAtTimestamp: string, updatedAtTimestamp: string, updatedAtBlock: string, marketCount: number, cumulativeQuoteVolume: string, protocolFeesCollected: string, settlementFeesCollected: string, builderFeesCollected: string }> };

export type VenueByPkQueryVariables = Exact<{
  id: string;
}>;


export type VenueByPkQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Venue_by_pk: { venueId: string, operatorId: number, marketType: string, feeParams: string, feeRecipientOverride: string, policy: string, signer: string, creationEnabled: boolean, context: string, createdAtTimestamp: string, updatedAtTimestamp: string, updatedAtBlock: string, marketCount: number, cumulativeQuoteVolume: string, protocolFeesCollected: string, settlementFeesCollected: string, builderFeesCollected: string } | null };

export type OperatorCountQueryVariables = Exact<{
  where: Operator_Bool_Exp;
}>;


export type OperatorCountQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, total: { aggregate: { count: number } | null } };

export type OperatorCountFallbackQueryVariables = Exact<{
  where: Operator_Bool_Exp;
  limit: number;
}>;


export type OperatorCountFallbackQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, rows: Array<{ id: string }> };

export type VenueCountQueryVariables = Exact<{
  where: Venue_Bool_Exp;
}>;


export type VenueCountQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, total: { aggregate: { count: number } | null } };

export type VenueCountFallbackQueryVariables = Exact<{
  where: Venue_Bool_Exp;
  limit: number;
}>;


export type VenueCountFallbackQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, rows: Array<{ id: string }> };

export type OracleQuestionFieldsFragment = { id: string, questionKey: string, scheduler: string, oracleCost: string, bindCount: number, reuseCount: number, createdAtBlock: string, createdAtTimestamp: string };

export type OperatorHubAccountFieldsFragment = { id: string, operatorId: number, earmarked: string, credit: string, outstanding: string, createdAtBlock: string, createdAtTimestamp: string, updatedAtBlock: string, updatedAtTimestamp: string };

export type OracleBindFieldsFragment = { id: string, oracleQuestionId: string, bindIndex: number, operatorId: number, measuredGas: string | null, overheadShare: string | null, cost: string | null, charged: string | null, subsidy: string | null, resolvedAt: string | null, boundAtBlock: string, boundAtTimestamp: string, txHash: string };

export type OracleCallbackFieldsFragment = { id: string, marketsResolved: string, gasPrice: string, measuredGas: string, overheadGasAttributed: string, totalCost: string, totalCharged: string, subsidy: string, pendingRemaining: string, blockNumber: string, timestamp: string, txHash: string };

export type OracleQuestionQueryVariables = Exact<{
  id: string;
}>;


export type OracleQuestionQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OracleQuestion_by_pk: { id: string, questionKey: string, scheduler: string, oracleCost: string, bindCount: number, reuseCount: number, createdAtBlock: string, createdAtTimestamp: string } | null };

export type OracleQuestionsQueryVariables = Exact<{
  where: OracleQuestion_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type OracleQuestionsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OracleQuestion: Array<{ id: string, questionKey: string, scheduler: string, oracleCost: string, bindCount: number, reuseCount: number, createdAtBlock: string, createdAtTimestamp: string }> };

export type OperatorHubAccountQueryVariables = Exact<{
  id: string;
}>;


export type OperatorHubAccountQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OperatorHubAccount_by_pk: { id: string, operatorId: number, earmarked: string, credit: string, outstanding: string, createdAtBlock: string, createdAtTimestamp: string, updatedAtBlock: string, updatedAtTimestamp: string } | null };

export type OperatorHubAccountsQueryVariables = Exact<{
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type OperatorHubAccountsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OperatorHubAccount: Array<{ id: string, operatorId: number, earmarked: string, credit: string, outstanding: string, createdAtBlock: string, createdAtTimestamp: string, updatedAtBlock: string, updatedAtTimestamp: string }> };

export type OracleBindsQueryVariables = Exact<{
  where: OracleBind_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type OracleBindsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OracleBind: Array<{ id: string, oracleQuestionId: string, bindIndex: number, operatorId: number, measuredGas: string | null, overheadShare: string | null, cost: string | null, charged: string | null, subsidy: string | null, resolvedAt: string | null, boundAtBlock: string, boundAtTimestamp: string, txHash: string }> };

export type OracleCallbacksQueryVariables = Exact<{
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type OracleCallbacksQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OracleCallback: Array<{ id: string, marketsResolved: string, gasPrice: string, measuredGas: string, overheadGasAttributed: string, totalCost: string, totalCharged: string, subsidy: string, pendingRemaining: string, blockNumber: string, timestamp: string, txHash: string }> };

export type OrderMarketFieldsFragment = { marketAddress: string | null, asset: string | null, question: string | null, expiry: string | null, tradingStart: string | null, quoteDecimals: number, intervalSec: string | null };

export type SweepableOrdersQueryVariables = Exact<{
  where: Order_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type SweepableOrdersQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Order: Array<{ id: string, orderId: string, owner: string, isBid: boolean, price: string, quantityRemaining: string, expireTimestampNs: string, placedAtTimestamp: string, market: string, marketRow: { poolAddress: string, marketType: MarketType, marketAddress: string | null, asset: string | null, question: string | null, expiry: string | null, tradingStart: string | null, quoteDecimals: number, intervalSec: string | null } | null }> };

export type OpenOrdersQueryVariables = Exact<{
  where: Order_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type OpenOrdersQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Order: Array<{ id: string, orderId: string, userData: string, side: BinarySide | null, isBid: boolean, price: string, quantityRemaining: string, market: string, marketRow: { poolAddress: string, marketAddress: string | null, asset: string | null, question: string | null, expiry: string | null, tradingStart: string | null, quoteDecimals: number, intervalSec: string | null } | null }> };

export type OrdersQueryVariables = Exact<{
  where: Order_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type OrdersQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Order: Array<{ id: string, orderId: string, userData: string, side: BinarySide | null, isBid: boolean, price: string, quantityRemaining: string, fullQuantity: string, filledQuantity: string, status: OrderStatus, rested: boolean, expireTimestampNs: string, placedTxHash: string, placedAtTimestamp: string, cancelReason: string | null, amendedFromOrderId: string | null, amendedToOrderId: string | null, market: string, marketRow: { poolAddress: string, marketAddress: string | null, asset: string | null, question: string | null, expiry: string | null, tradingStart: string | null, quoteDecimals: number, intervalSec: string | null } | null }> };

export type OrderDetailQueryVariables = Exact<{
  id: string;
}>;


export type OrderDetailQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Order: Array<{ id: string, orderId: string, owner: string, userData: string, side: BinarySide | null, isBid: boolean, price: string, quantityRemaining: string, fullQuantity: string, filledQuantity: string, status: OrderStatus, rested: boolean, expireTimestampNs: string, placedTxHash: string, placedAtTimestamp: string, placedAtBlock: string, lastUpdatedAtTimestamp: string, cancelReason: string | null, amendedFromOrderId: string | null, amendedToOrderId: string | null, market: string, marketRow: { poolAddress: string, marketAddress: string | null, asset: string | null, question: string | null, expiry: string | null, tradingStart: string | null, quoteDecimals: number, intervalSec: string | null } | null, marketRef: { id: string, marketType: MarketType, poolAddress: string, marketAddress: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseDecimals: number, quoteDecimals: number, asset: string | null, question: string | null } | null }> };

export type BookTopsQueryVariables = Exact<{
  bidWhere: Order_Bool_Exp;
  askWhere: Order_Bool_Exp;
}>;


export type BookTopsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, bids: Array<{ price: string, market: string }>, asks: Array<{ price: string, market: string }> };

export type OrderCountQueryVariables = Exact<{
  where: Order_Bool_Exp;
}>;


export type OrderCountQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, total: { aggregate: { count: number } | null } };

export type OrderCountFallbackQueryVariables = Exact<{
  where: Order_Bool_Exp;
  limit: number;
}>;


export type OrderCountFallbackQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, rows: Array<{ id: string }> };

export type FundingPaymentsQueryVariables = Exact<{
  where: FundingPayment_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type FundingPaymentsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, FundingPayment: Array<{ id: string, account: string, pool: string | null, amount: string, timestamp: string, txHash: string }> };

export type MarginEventsQueryVariables = Exact<{
  where: MarginEvent_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type MarginEventsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, MarginEvent: Array<{ id: string, account: string, kind: string, pool: string | null, amount: string, granter: string | null, timestamp: string, txHash: string }> };

export type LiquidationsQueryVariables = Exact<{
  where: LiquidationEvent_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type LiquidationsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, LiquidationEvent: Array<{ id: string, account: string, pool: string | null, kind: string, size: string | null, price: string | null, counterparty: string | null, penalty: string | null, badDebt: string | null, insuranceCovered: string | null, deficit: string | null, coverageDeclined: string | null, collateralAmount: string | null, equity: string | null, positionsProcessed: string | null, stageReached: number | null, marginStatusBefore: number | null, marginStatusAfter: number | null, timestamp: string, blockNumber: string, txHash: string }> };

export type FundingRateHistoryQueryVariables = Exact<{
  where: FundingRateUpdate_Bool_Exp;
  orderBy?: Array<FundingRateUpdate_Order_By> | FundingRateUpdate_Order_By | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type FundingRateHistoryQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, FundingRateUpdate: Array<{ id: string, pool: string, fundingRate: string, cumulativeFundingPerUnit: string, indexPrice: string, markPrice: string | null, intervalsSettled: string, intervalsAccrued: string, fundingWindowSec: number, fundingIntervalSec: number, spanStart: string, spanEnd: string, anchorResynced: boolean, timestamp: string, blockNumber: string, txHash: string }> };

export type FundingRateCandlesQueryVariables = Exact<{
  where: FundingRateCandle_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type FundingRateCandlesQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, FundingRateCandle: Array<{ id: string, pool: string, intervalSeconds: number, bucketStart: string, avgFundingRate8h: string, minFundingRate8h: string | null, maxFundingRate8h: string | null, coverage: string, cumulativeFundingStart: string, cumulativeFundingEnd: string, fundingWindowSec: number, fundingIntervalSec: number, paramsChangedInBucket: boolean, indexPriceEnd: string | null, openInterestEnd: string | null, updateCount: number }> };

export type PerpFeesQueryVariables = Exact<{
  where: PerpFeeRecord_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PerpFeesQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, PerpFeeRecord: Array<{ id: string, account: string, pool: string | null, amount: string, isRebate: boolean, kind: string, insurancePortion: string | null, tier: string | null, fillNotional: string | null, builder: string | null, timestamp: string, txHash: string }> };

export type OpenInterestHistoryQueryVariables = Exact<{
  pool: string;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type OpenInterestHistoryQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, OpenInterestSnapshot: Array<{ id: string, pool: string, openInterest: string, timestamp: string, blockNumber: string }> };

export type PerpOrderRejectionsQueryVariables = Exact<{
  where: PerpOrderRejection_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PerpOrderRejectionsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, PerpOrderRejection: Array<{ id: string, owner: string, pool: string, reason: number, requestIndex: string, timestamp: string, blockNumber: string, txHash: string }> };

export type PerpPositionChangesQueryVariables = Exact<{
  where: PerpPositionChange_Bool_Exp;
  orderBy?: Array<PerpPositionChange_Order_By> | PerpPositionChange_Order_By | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PerpPositionChangesQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, PerpPositionChange: Array<{ id: string, pool: string, account: string, kind: PerpPositionChangeKind, sizeBefore: string, sizeAfter: string, closedSize: string, entryPriceBefore: string | null, entryPriceAfter: string, exitPrice: string | null, orderId: string | null, realizedPnl: string, timestamp: string, blockNumber: string, logIndex: number, txHash: string }> };

export type PerpWalletLinkEventsQueryVariables = Exact<{
  where: PerpWalletLinkEvent_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PerpWalletLinkEventsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, PerpWalletLinkEvent: Array<{ id: string, kind: string, main: string, child: string, timestamp: string, blockNumber: string, logIndex: number, txHash: string }> };

export type PerpMarginPullsQueryVariables = Exact<{
  where: PerpMarginPull_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PerpMarginPullsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, PerpMarginPull: Array<{ id: string, account: string, pool: string, orderId: string, source: string, amount: string, payer: string | null, timestamp: string, blockNumber: string, txHash: string }> };

export type PerpMainFundingEventsQueryVariables = Exact<{
  where: PerpMainFundingEvent_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PerpMainFundingEventsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, PerpMainFundingEvent: Array<{ id: string, account: string, kind: string, payer: string | null, amount: string | null, previousPrincipal: string | null, outstandingPrincipal: string | null, timestamp: string, blockNumber: string, txHash: string }> };

export type PerpPortfolioMarketFieldsFragment = { poolAddress: string, baseSymbol: string | null, quoteSymbol: string | null, baseDecimals: number, quoteDecimals: number, tickSize: string | null, lotSize: string | null, minQuantity: string | null, lastPrice: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, indexPrice: string | null, stopRegistry: string | null };

export type PerpPortfolioQueryVariables = Exact<{
  fillWhere: Fill_Bool_Exp;
  orderWhere: Order_Bool_Exp;
  ordersLimit?: number | null | undefined;
  tradesLimit?: number | null | undefined;
}>;


export type PerpPortfolioQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, PerpOrder: Array<{ id: string, orderId: string, isBid: boolean, price: string, quantityRemaining: string, filledQuantity: string, fullQuantity: string, placedAtTimestamp: string, placedTxHash: string, market: { poolAddress: string, baseSymbol: string | null, quoteSymbol: string | null, baseDecimals: number, quoteDecimals: number, tickSize: string | null, lotSize: string | null, minQuantity: string | null, lastPrice: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, indexPrice: string | null, stopRegistry: string | null } | null }>, PerpFill: Array<{ id: string, fillPrice: string, quantity: string, quoteQuantity: string, timestamp: string, txHash: string, maker: string | null, taker: string | null, takerIsBid: boolean | null, market: { poolAddress: string, baseSymbol: string | null, quoteSymbol: string | null, baseDecimals: number, quoteDecimals: number, tickSize: string | null, lotSize: string | null, minQuantity: string | null, lastPrice: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, indexPrice: string | null, stopRegistry: string | null } | null }> };

export type PerpOrderHistoryQueryVariables = Exact<{
  where: Order_Bool_Exp;
  orderBy?: Array<Order_Order_By> | Order_Order_By | null | undefined;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PerpOrderHistoryQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Order: Array<{ id: string, orderId: string, isBid: boolean, price: string, quantityRemaining: string, filledQuantity: string, fullQuantity: string, status: OrderStatus, rested: boolean, cancelReason: string | null, expireTimestampNs: string, placedAtTimestamp: string, placedTxHash: string, lastUpdatedAtTimestamp: string, market: { poolAddress: string, baseSymbol: string | null, quoteSymbol: string | null, baseDecimals: number, quoteDecimals: number, tickSize: string | null, lotSize: string | null, minQuantity: string | null, lastPrice: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, indexPrice: string | null, stopRegistry: string | null } | null }> };

export type PerpPositionsQueryVariables = Exact<{
  where: PerpPosition_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PerpPositionsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, PerpPosition: Array<{ id: string, pool: string, account: string, size: string, isLong: boolean, entryPriceX18: string | null, realizedPnl: string | null, updatedAt: string, updatedAtBlock: number | null }> };

export type PerpStopOrdersQueryVariables = Exact<{
  where: StopOrder_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PerpStopOrdersQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, StopOrder: Array<{ id: string, registry: string, orderIdRaw: string, owner: string, isBid: boolean, quantity: string, triggerPrice: string, triggerOperator: number, orderType: number, builder: string, builderFeeBpsTimes1k: string, status: StopOrderStatus, placedOrderId: string | null, dropReason: number | null, siblingOrderId: string | null, intent: number | null, cancelReason: string | null, createdAt: string, updatedAt: string, txHash: string, market: { poolAddress: string, baseSymbol: string | null, quoteSymbol: string | null, baseDecimals: number, quoteDecimals: number } | null }> };

export type PerpInsuranceFundEventsQueryVariables = Exact<{
  where: PerpInsuranceFundEvent_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type PerpInsuranceFundEventsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, PerpInsuranceFundEvent: Array<{ id: string, kind: string, tier: string | null, toTier: string | null, amount: string | null, requested: string | null, covered: string | null, account: string | null, counterparty: string | null, caller: string | null, timestamp: string, blockNumber: string, logIndex: number, txHash: string }> };

export type MarketsByPoolQueryVariables = Exact<{
  pool: string;
  limit?: number | null | undefined;
}>;


export type MarketsByPoolQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ id: string, marketType: MarketType, poolAddress: string, lastPrice: string | null, lastTradeAt: string | null, cumulativeBaseVolume: string, cumulativeQuoteVolume: string, tradeCount: string, baseDecimals: number, quoteDecimals: number, createdAtTimestamp: string, createdAtBlock: string, baseToken: string | null, quoteToken: string | null, baseSymbol: string | null, quoteSymbol: string | null, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, markPrice: string | null, rawMidpoint: string | null, markPriceUpdatedAt: string | null, stopRegistry: string | null, marginBank: string | null, initialMarginBps: number | null, fundingRate: string | null, cumulativeFundingPerUnit: string | null, indexPrice: string | null, fundingUpdatedAt: string | null, fundingWindowSec: number | null, fundingIntervalSec: number | null, openInterest: string | null, openInterestUpdatedAt: string | null, marketId: string | null, marketAddress: string | null, yesTokenId: string | null, noTokenId: string | null, collateral: string | null, asset: string | null, question: string | null, oracleQuestion: string | null, oracleQuestionId: string | null, strike: string | null, tradingStart: string | null, expiry: string | null, winningOutcome: number | null, payoutNumerators: Array<string> | null, payoutDenominator: string | null, settledPayoutNumerators: Array<string> | null, voidVectorSource: number | null, resolvedAtBlock: string | null, resolvedAtTimestamp: string | null, createdByTx: string | null, creator: string | null, voided: boolean, backing: string, nonce: string | null, finalized: boolean | null, netBacking: string | null, context: string | null, intervalSec: string | null, operatorId: number | null, venueId: string | null, voidPolicy: number | null, status: BinaryMarketStatus | null }> };

export type PoolBindingsQueryVariables = Exact<{
  pool: string;
  limit: number;
  offset: number;
}>;


export type PoolBindingsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, PoolBinding: Array<{ id: string, poolAddress: string, marketId: string, nonce: string, fromBlock: string, fromLogIndex: number, fromTimestamp: string, toBlock: string | null, toLogIndex: number | null, toTimestamp: string | null, closedBy: string | null }> };

export type PoolByPkQueryVariables = Exact<{
  id: string;
}>;


export type PoolByPkQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Pool_by_pk: { id: string, address: string, collateral: string | null, creator: string | null, currentMarketId: string | null, currentNonce: string | null, generationCount: number, createdAtTimestamp: string, updatedAtTimestamp: string } | null };

export type PoolTypesQueryVariables = Exact<{
  pools: Array<string> | string;
  limit?: number | null | undefined;
}>;


export type PoolTypesQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ poolAddress: string, marketType: MarketType }> };

export type PoolsByTypeQueryVariables = Exact<{
  where: Market_Bool_Exp;
  limit?: number | null | undefined;
}>;


export type PoolsByTypeQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, Market: Array<{ poolAddress: string }> };

export type RouterActionFieldsFragment = { id: string, kind: string, account: string, amount: string, payout: string | null, routedVia: string | null, timestamp: string, txHash: string, market: string };

export type RouterActionsQueryVariables = Exact<{
  where: RouterActionRecord_Bool_Exp;
  limit?: number | null | undefined;
  offset?: number | null | undefined;
}>;


export type RouterActionsQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, RouterActionRecord: Array<{ id: string, kind: string, account: string, amount: string, payout: string | null, routedVia: string | null, timestamp: string, txHash: string, market: string }> };

export type SpotPortfolioMarketFieldsFragment = { poolAddress: string, baseSymbol: string | null, quoteSymbol: string | null, baseToken: string | null, quoteToken: string | null, baseDecimals: number, quoteDecimals: number, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, lastPrice: string | null, markPrice: string | null, stopRegistry: string | null };

export type SpotPortfolioQueryVariables = Exact<{
  acct: string;
  fillWhere: Fill_Bool_Exp;
  orderWhere: Order_Bool_Exp;
  ordersLimit?: number | null | undefined;
  tradesLimit?: number | null | undefined;
}>;


export type SpotPortfolioQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, SpotOrder: Array<{ id: string, orderId: string, isBid: boolean, price: string, quantityRemaining: string, filledQuantity: string, fullQuantity: string, placedAtTimestamp: string, placedTxHash: string, market: { poolAddress: string, baseSymbol: string | null, quoteSymbol: string | null, baseToken: string | null, quoteToken: string | null, baseDecimals: number, quoteDecimals: number, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, lastPrice: string | null, markPrice: string | null, stopRegistry: string | null } | null }>, SpotStopOrder: Array<{ id: string, registry: string, isBid: boolean, quantity: string, triggerPrice: string, triggerOperator: number, orderType: number, status: StopOrderStatus, placedOrderId: string | null, createdAt: string, orderId: string, market: { poolAddress: string, baseSymbol: string | null, quoteSymbol: string | null, baseToken: string | null, quoteToken: string | null, baseDecimals: number, quoteDecimals: number, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, lastPrice: string | null, markPrice: string | null, stopRegistry: string | null } | null }>, SpotFill: Array<{ id: string, fillPrice: string, quantity: string, quoteQuantity: string, timestamp: string, txHash: string, maker: string | null, taker: string | null, takerIsBid: boolean | null, market: { poolAddress: string, baseSymbol: string | null, quoteSymbol: string | null, baseToken: string | null, quoteToken: string | null, baseDecimals: number, quoteDecimals: number, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, lastPrice: string | null, markPrice: string | null, stopRegistry: string | null } | null }> };

export type SpotStopOrderFieldsFragment = { id: string, registry: string, isBid: boolean, quantity: string, triggerPrice: string, triggerOperator: number, orderType: number, status: StopOrderStatus, placedOrderId: string | null, createdAt: string, orderId: string };

export type SpotStopOrdersQueryVariables = Exact<{
  where: StopOrder_Bool_Exp;
  limit?: number | null | undefined;
}>;


export type SpotStopOrdersQuery = { _sdkWatermark: Array<{ chain_id: number | null, latest_processed_block: number | null }>, StopOrder: Array<{ id: string, registry: string, isBid: boolean, quantity: string, triggerPrice: string, triggerOperator: number, orderType: number, status: StopOrderStatus, placedOrderId: string | null, createdAt: string, orderId: string, market: { poolAddress: string, baseSymbol: string | null, quoteSymbol: string | null, baseToken: string | null, quoteToken: string | null, baseDecimals: number, quoteDecimals: number, baseIsNative: boolean | null, tickSize: string | null, lotSize: string | null, minQuantity: string | null, lastPrice: string | null, markPrice: string | null, stopRegistry: string | null } | null }> };

export type SyncStatusQueryVariables = Exact<{
  chainId: number;
}>;


export type SyncStatusQuery = { chain_metadata: Array<{ chain_id: number | null, latest_processed_block: number | null, block_height: number | null, num_events_processed: number | null }> };

export type IndexedChainsQueryVariables = Exact<{ [key: string]: never; }>;


export type IndexedChainsQuery = { chain_metadata: Array<{ chain_id: number | null }> };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const AccountOrderRowFragmentDoc = new TypedDocumentString(`
    fragment AccountOrderRow on Order {
  id
  market_id
  orderId
  orderIdRaw
  owner
  isBid
  side
  userData
  price
  fullQuantity
  quantityRemaining
  filledQuantity
  expireTimestampNs
  status
  rested
  cancelReason
  amendedFromOrderId
  amendedToOrderId
  placedAtBlock
  placedAtTimestamp
  placedTxHash
  lastUpdatedAtBlock
  lastUpdatedAtTimestamp
}
    `, {"fragmentName":"AccountOrderRow"}) as unknown as TypedDocumentString<AccountOrderRowFragment, unknown>;
export const ActivityFillFieldsFragmentDoc = new TypedDocumentString(`
    fragment ActivityFillFields on Fill {
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  takerIsBid
  takerOrder {
    owner
    side
  }
  blockNumber
  timestamp
  txHash
}
    `, {"fragmentName":"ActivityFillFields"}) as unknown as TypedDocumentString<ActivityFillFieldsFragment, unknown>;
export const ActivityRouterFieldsFragmentDoc = new TypedDocumentString(`
    fragment ActivityRouterFields on RouterActionRecord {
  id
  kind
  market: market_id
  account
  amount
  payout
  routedVia
  blockNumber
  timestamp
  txHash
}
    `, {"fragmentName":"ActivityRouterFields"}) as unknown as TypedDocumentString<ActivityRouterFieldsFragment, unknown>;
export const ActivityResolutionFieldsFragmentDoc = new TypedDocumentString(`
    fragment ActivityResolutionFields on MarketResolutionEvent {
  id
  kind
  market: market_id
  outcomeIdx
  voided
  blockNumber
  timestamp
  txHash
}
    `, {"fragmentName":"ActivityResolutionFields"}) as unknown as TypedDocumentString<ActivityResolutionFieldsFragment, unknown>;
export const ActivityStatusFieldsFragmentDoc = new TypedDocumentString(`
    fragment ActivityStatusFields on MarketStatusUpdate {
  id
  market: market_id
  oldStatus
  newStatus
  blockNumber
  timestamp
  txHash
}
    `, {"fragmentName":"ActivityStatusFields"}) as unknown as TypedDocumentString<ActivityStatusFieldsFragment, unknown>;
export const TransactionOrderFieldsFragmentDoc = new TypedDocumentString(`
    fragment TransactionOrderFields on Order {
  id
  orderId
  market_id
  owner
  isBid
  side
  price
  fullQuantity
  filledQuantity
  quantityRemaining
  status
  rested
  cancelReason
  placedAtTimestamp
  placedTxHash
}
    `, {"fragmentName":"TransactionOrderFields"}) as unknown as TypedDocumentString<TransactionOrderFieldsFragment, unknown>;
export const BlockOrderFieldsFragmentDoc = new TypedDocumentString(`
    fragment BlockOrderFields on Order {
  id
  orderId
  market_id
  owner
  isBid
  side
  price
  fullQuantity
  cancelReason
  placedAtBlock
  placedTxHash
}
    `, {"fragmentName":"BlockOrderFields"}) as unknown as TypedDocumentString<BlockOrderFieldsFragment, unknown>;
export const PortfolioMarketFieldsFragmentDoc = new TypedDocumentString(`
    fragment PortfolioMarketFields on Market {
  id
  marketAddress
  poolAddress
  asset
  question
  status: clobStatus
  lastPrice
  strike
  expiry
  winningOutcome
  voided
  payoutNumerators
  payoutDenominator
  quoteDecimals
  intervalSec
}
    `, {"fragmentName":"PortfolioMarketFields"}) as unknown as TypedDocumentString<PortfolioMarketFieldsFragment, unknown>;
export const ProtocolFeeFieldsFragmentDoc = new TypedDocumentString(`
    fragment ProtocolFeeFields on ProtocolFeeRecord {
  id
  orderId
  recipient
  payer
  token
  amount
  isTakerSide
  market: market_id
  pool
  timestamp
  txHash
}
    `, {"fragmentName":"ProtocolFeeFields"}) as unknown as TypedDocumentString<ProtocolFeeFieldsFragment, unknown>;
export const BuilderFeeFieldsFragmentDoc = new TypedDocumentString(`
    fragment BuilderFeeFields on BuilderFeeRecord {
  id
  orderId
  builder
  payer
  token
  amount
  market: market_id
  pool
  timestamp
  txHash
}
    `, {"fragmentName":"BuilderFeeFields"}) as unknown as TypedDocumentString<BuilderFeeFieldsFragment, unknown>;
export const SettlementFeeFieldsFragmentDoc = new TypedDocumentString(`
    fragment SettlementFeeFields on SettlementFeeRecord {
  id
  recipient: feeRecipient
  amount: fee
  winningBacking
  market: market_id
  timestamp
  txHash
}
    `, {"fragmentName":"SettlementFeeFields"}) as unknown as TypedDocumentString<SettlementFeeFieldsFragment, unknown>;
export const FillQueryFieldsFragmentDoc = new TypedDocumentString(`
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}
    `, {"fragmentName":"FillQueryFields"}) as unknown as TypedDocumentString<FillQueryFieldsFragment, unknown>;
export const MarketRefFieldsFragmentDoc = new TypedDocumentString(`
    fragment MarketRefFields on Market {
  id
  marketType
  poolAddress
  marketAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  asset
  question
}
    `, {"fragmentName":"MarketRefFields"}) as unknown as TypedDocumentString<MarketRefFieldsFragment, unknown>;
export const TradeContextFillFieldsFragmentDoc = new TypedDocumentString(`
    fragment TradeContextFillFields on Fill {
  id
  market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  takerOrder {
    owner
    side
  }
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  blockNumber
  timestamp
  logIndex
  txHash
}
    `, {"fragmentName":"TradeContextFillFields"}) as unknown as TypedDocumentString<TradeContextFillFieldsFragment, unknown>;
export const FillOrderFieldsFragmentDoc = new TypedDocumentString(`
    fragment FillOrderFields on Order {
  id
  orderId
  owner
  isBid
  side
  price
  fullQuantity
  filledQuantity
  quantityRemaining
  status
  rested
  cancelReason
  placedAtTimestamp
  placedTxHash
}
    `, {"fragmentName":"FillOrderFields"}) as unknown as TypedDocumentString<FillOrderFieldsFragment, unknown>;
export const SeriesFieldsFragmentDoc = new TypedDocumentString(`
    fragment SeriesFields on Series {
  id
  creatorAddress
  seriesId
  collateral
  asset
  intervalSec
  createdAtTimestamp
  updatedAtTimestamp
}
    `, {"fragmentName":"SeriesFields"}) as unknown as TypedDocumentString<SeriesFieldsFragment, unknown>;
export const MarketCreatorFieldsFragmentDoc = new TypedDocumentString(`
    fragment MarketCreatorFields on MarketCreator {
  id
  owner
  policy
  core
  adapter
  operatorId
  venueId
  factory
  createdAtBlock
  createdAtTimestamp
}
    `, {"fragmentName":"MarketCreatorFields"}) as unknown as TypedDocumentString<MarketCreatorFieldsFragment, unknown>;
export const OracleAdapterFieldsFragmentDoc = new TypedDocumentString(`
    fragment OracleAdapterFields on OracleAdapter {
  id
  owner
  factory
  approved
  approvedAtTimestamp
  createdAtTimestamp
}
    `, {"fragmentName":"OracleAdapterFields"}) as unknown as TypedDocumentString<OracleAdapterFieldsFragment, unknown>;
export const MarketFieldsFragmentDoc = new TypedDocumentString(`
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}
    `, {"fragmentName":"MarketFields"}) as unknown as TypedDocumentString<MarketFieldsFragment, unknown>;
export const OperatorFieldsFragmentDoc = new TypedDocumentString(`
    fragment OperatorFields on Operator {
  operatorId
  owner
  feeRecipient
  enabled
  policy
  context
  pendingOwner
  venueCount
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}
    `, {"fragmentName":"OperatorFields"}) as unknown as TypedDocumentString<OperatorFieldsFragment, unknown>;
export const VenueFieldsFragmentDoc = new TypedDocumentString(`
    fragment VenueFields on Venue {
  venueId
  operatorId
  marketType
  feeParams
  feeRecipientOverride
  policy
  signer
  creationEnabled
  context
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}
    `, {"fragmentName":"VenueFields"}) as unknown as TypedDocumentString<VenueFieldsFragment, unknown>;
export const OracleQuestionFieldsFragmentDoc = new TypedDocumentString(`
    fragment OracleQuestionFields on OracleQuestion {
  id
  questionKey
  scheduler
  oracleCost
  bindCount
  reuseCount
  createdAtBlock
  createdAtTimestamp
}
    `, {"fragmentName":"OracleQuestionFields"}) as unknown as TypedDocumentString<OracleQuestionFieldsFragment, unknown>;
export const OperatorHubAccountFieldsFragmentDoc = new TypedDocumentString(`
    fragment OperatorHubAccountFields on OperatorHubAccount {
  id
  operatorId
  earmarked
  credit
  outstanding
  createdAtBlock
  createdAtTimestamp
  updatedAtBlock
  updatedAtTimestamp
}
    `, {"fragmentName":"OperatorHubAccountFields"}) as unknown as TypedDocumentString<OperatorHubAccountFieldsFragment, unknown>;
export const OracleBindFieldsFragmentDoc = new TypedDocumentString(`
    fragment OracleBindFields on OracleBind {
  id
  oracleQuestionId
  bindIndex
  operatorId
  measuredGas
  overheadShare
  cost
  charged
  subsidy
  resolvedAt
  boundAtBlock
  boundAtTimestamp
  txHash
}
    `, {"fragmentName":"OracleBindFields"}) as unknown as TypedDocumentString<OracleBindFieldsFragment, unknown>;
export const OracleCallbackFieldsFragmentDoc = new TypedDocumentString(`
    fragment OracleCallbackFields on OracleCallback {
  id
  marketsResolved
  gasPrice
  measuredGas
  overheadGasAttributed
  totalCost
  totalCharged
  subsidy
  pendingRemaining
  blockNumber
  timestamp
  txHash
}
    `, {"fragmentName":"OracleCallbackFields"}) as unknown as TypedDocumentString<OracleCallbackFieldsFragment, unknown>;
export const OrderMarketFieldsFragmentDoc = new TypedDocumentString(`
    fragment OrderMarketFields on Market {
  marketAddress
  asset
  question
  expiry
  tradingStart
  quoteDecimals
  intervalSec
}
    `, {"fragmentName":"OrderMarketFields"}) as unknown as TypedDocumentString<OrderMarketFieldsFragment, unknown>;
export const PerpPortfolioMarketFieldsFragmentDoc = new TypedDocumentString(`
    fragment PerpPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  tickSize
  lotSize
  minQuantity
  lastPrice
  marginBank
  initialMarginBps
  fundingRate
  indexPrice
  stopRegistry
}
    `, {"fragmentName":"PerpPortfolioMarketFields"}) as unknown as TypedDocumentString<PerpPortfolioMarketFieldsFragment, unknown>;
export const RouterActionFieldsFragmentDoc = new TypedDocumentString(`
    fragment RouterActionFields on RouterActionRecord {
  id
  kind
  account
  market: market_id
  amount
  payout
  routedVia
  timestamp
  txHash
}
    `, {"fragmentName":"RouterActionFields"}) as unknown as TypedDocumentString<RouterActionFieldsFragment, unknown>;
export const SpotPortfolioMarketFieldsFragmentDoc = new TypedDocumentString(`
    fragment SpotPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseToken
  quoteToken
  baseDecimals
  quoteDecimals
  baseIsNative
  tickSize
  lotSize
  minQuantity
  lastPrice
  markPrice
  stopRegistry
}
    `, {"fragmentName":"SpotPortfolioMarketFields"}) as unknown as TypedDocumentString<SpotPortfolioMarketFieldsFragment, unknown>;
export const SpotStopOrderFieldsFragmentDoc = new TypedDocumentString(`
    fragment SpotStopOrderFields on StopOrder {
  id
  registry
  orderId: orderIdRaw
  isBid
  quantity
  triggerPrice
  triggerOperator
  orderType
  status
  placedOrderId
  createdAt
}
    `, {"fragmentName":"SpotStopOrderFields"}) as unknown as TypedDocumentString<SpotStopOrderFieldsFragment, unknown>;
export const SnapshotVersionDocument = new TypedDocumentString(`
    query SnapshotVersion($capabilityId: String!, $guardId: String!) {
  capability: AccountCapability_by_pk(id: $capabilityId) {
    id
    chainId
    capability
    contractVersion
    datasetGeneration
    manifestDigest
    changeStartBlock
    readiness
    unavailableReason
    orderCapacity
    stopCapacity
    retentionBatches
    publicRoleMaxRows
    publicRoleMaxResponseBytes
  }
  guard: AccountSnapshotGuard_by_pk(id: $guardId) {
    id
    account
    datasetGeneration
    blockNumber
    blockHash
    digest
  }
}
    `) as unknown as TypedDocumentString<SnapshotVersionQuery, SnapshotVersionQueryVariables>;
export const AccountOrderRowsDocument = new TypedDocumentString(`
    query AccountOrderRows($account: String!, $chainId: Int!, $orderLimit: Int!, $stopLimit: Int!, $nowNs: numeric!) {
  watermark: chain_metadata(where: {chain_id: {_eq: $chainId}}) {
    latest_processed_block
  }
  ordersWithoutExpiry: Order(
    where: {owner: {_eq: $account}, status: {_eq: "Open"}, expireTimestampNs: {_eq: 0}}
    order_by: {id: asc}
    limit: $orderLimit
  ) {
    ...AccountOrderRow
  }
  ordersWithExpiry: Order(
    where: {owner: {_eq: $account}, status: {_eq: "Open"}, expireTimestampNs: {_gte: $nowNs}}
    order_by: [{expireTimestampNs: asc}, {id: asc}]
    limit: $orderLimit
  ) {
    ...AccountOrderRow
  }
  stops: StopOrder(
    where: {owner: {_eq: $account}, status: {_eq: "PENDING"}}
    order_by: {id: asc}
    limit: $stopLimit
  ) {
    id
    registry
    market_id
    orderIdRaw
    owner
    isBid
    quantity
    triggerPrice
    triggerOperator
    orderType
    builder
    builderFeeBpsTimes1k
    status
    placedOrderId
    dropReason
    siblingOrderId
    intent
    cancelReason
    createdAt
    updatedAt
    txHash
  }
}
    fragment AccountOrderRow on Order {
  id
  market_id
  orderId
  orderIdRaw
  owner
  isBid
  side
  userData
  price
  fullQuantity
  quantityRemaining
  filledQuantity
  expireTimestampNs
  status
  rested
  cancelReason
  amendedFromOrderId
  amendedToOrderId
  placedAtBlock
  placedAtTimestamp
  placedTxHash
  lastUpdatedAtBlock
  lastUpdatedAtTimestamp
}`) as unknown as TypedDocumentString<AccountOrderRowsQuery, AccountOrderRowsQueryVariables>;
export const OutcomePositionsSnapshotVersionDocument = new TypedDocumentString(`
    query OutcomePositionsSnapshotVersion($capabilityId: String!, $guardId: String!) {
  capability: AccountOutcomePositionCapability_by_pk(id: $capabilityId) {
    id
    chainId
    capability
    contractVersion
    datasetGeneration
    manifestDigest
    changeStartBlock
    readiness
    unavailableReason
    positionCapacity
    publicRoleMaxRows
    publicRoleMaxResponseBytes
    indexedFields
    indexedWhenPresentFields
    enrichmentFields
  }
  guard: AccountOutcomePositionGuard_by_pk(id: $guardId) {
    id
    account
    datasetGeneration
    blockNumber
    blockHash
    digest
  }
}
    `) as unknown as TypedDocumentString<OutcomePositionsSnapshotVersionQuery, OutcomePositionsSnapshotVersionQueryVariables>;
export const AccountOutcomePositionRowsDocument = new TypedDocumentString(`
    query AccountOutcomePositionRows($account: String!, $chainId: Int!, $positionLimit: Int!) {
  watermark: chain_metadata(where: {chain_id: {_eq: $chainId}}) {
    latest_processed_block
  }
  positions: OutcomeBalance(
    where: {account: {_eq: $account}, balance: {_gt: 0}}
    order_by: {id: asc}
    limit: $positionLimit
  ) {
    id
    market_id
    account
    outcomeIndex
    tokenId
    balance
    updatedAtBlock
    market {
      clobStatus
      tradingStart
      expiry
      voided
      finalized
      payoutDenominator
      settledPayoutNumerators
    }
  }
}
    `) as unknown as TypedDocumentString<AccountOutcomePositionRowsQuery, AccountOutcomePositionRowsQueryVariables>;
export const AccountCapabilityWatchDocument = new TypedDocumentString(`
    subscription AccountCapabilityWatch($capabilityId: String!) {
  capability: AccountCapability_by_pk(id: $capabilityId) {
    id
    chainId
    capability
    contractVersion
    datasetGeneration
    manifestDigest
    changeStartBlock
    readiness
    unavailableReason
    orderCapacity
    stopCapacity
    retentionBatches
    publicRoleMaxRows
    publicRoleMaxResponseBytes
  }
}
    `) as unknown as TypedDocumentString<AccountCapabilityWatchSubscription, AccountCapabilityWatchSubscriptionVariables>;
export const AccountGuardWatchDocument = new TypedDocumentString(`
    subscription AccountGuardWatch($guardId: String!) {
  guard: AccountSnapshotGuard_by_pk(id: $guardId) {
    id
    account
    datasetGeneration
    blockNumber
    blockHash
    digest
  }
}
    `) as unknown as TypedDocumentString<AccountGuardWatchSubscription, AccountGuardWatchSubscriptionVariables>;
export const AccountChangeBatchStreamDocument = new TypedDocumentString(`
    subscription AccountChangeBatchStream($account: String!, $datasetGeneration: String!, $afterBlock: numeric!, $batchSize: Int!) {
  batches: AccountChangeBatch_stream(
    batch_size: $batchSize
    cursor: {initial_value: {blockNumber: $afterBlock}, ordering: ASC}
    where: {account: {_eq: $account}, datasetGeneration: {_eq: $datasetGeneration}}
  ) {
    id
    account
    datasetGeneration
    blockNumber
    blockHash
    digest
    predecessorBlockNumber
    predecessorBlockHash
    predecessorDigest
    orderChangeCount
    stopChangeCount
    overflow
  }
}
    `) as unknown as TypedDocumentString<AccountChangeBatchStreamSubscription, AccountChangeBatchStreamSubscriptionVariables>;
export const AccountChangeChildrenDocument = new TypedDocumentString(`
    query AccountChangeChildren($batchIds: [String!]!, $orderChildLimit: Int!, $stopChildLimit: Int!) {
  orderChanges: AccountOrderChange(
    where: {batch_id: {_in: $batchIds}}
    order_by: [{blockNumber: desc}, {id: asc}]
    limit: $orderChildLimit
  ) {
    id
    batch_id
    account
    datasetGeneration
    blockNumber
    operation
    physicalEntityId
    terminalCause
    market_id
    orderId
    orderIdRaw
    isBid
    side
    userData
    price
    fullQuantity
    quantityRemaining
    filledQuantity
    expireTimestampNs
    status
    rested
    cancelReason
    amendedFromOrderId
    amendedToOrderId
    placedAtBlock
    placedAtTimestamp
    placedTxHash
    lastUpdatedAtBlock
    lastUpdatedAtTimestamp
  }
  stopChanges: AccountStopChange(
    where: {batch_id: {_in: $batchIds}}
    order_by: [{blockNumber: desc}, {id: asc}]
    limit: $stopChildLimit
  ) {
    id
    batch_id
    account
    datasetGeneration
    blockNumber
    operation
    physicalEntityId
    terminalCause
    registry
    market_id
    orderIdRaw
    isBid
    quantity
    triggerPrice
    triggerOperator
    orderType
    builder
    builderFeeBpsTimes1k
    status
    placedOrderId
    dropReason
    siblingOrderId
    intent
    cancelReason
    createdAt
    updatedAt
    txHash
  }
}
    `) as unknown as TypedDocumentString<AccountChangeChildrenQuery, AccountChangeChildrenQueryVariables>;
export const MarketActivityDocument = new TypedDocumentString(`
    query MarketActivity($fillWhere: Fill_bool_exp!, $routerWhere: RouterActionRecord_bool_exp!, $resolutionWhere: MarketResolutionEvent_bool_exp!, $statusWhere: MarketStatusUpdate_bool_exp!, $fillLimit: Int!, $routerLimit: Int!, $resolutionLimit: Int!, $statusLimit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: $fillWhere
    order_by: [{timestamp: desc}, {blockNumber: desc}, {logIndex: desc}]
    limit: $fillLimit
  ) {
    ...ActivityFillFields
  }
  RouterActionRecord(
    where: $routerWhere
    order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}]
    limit: $routerLimit
  ) {
    ...ActivityRouterFields
  }
  MarketResolutionEvent(
    where: $resolutionWhere
    order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}]
    limit: $resolutionLimit
  ) {
    ...ActivityResolutionFields
  }
  MarketStatusUpdate(
    where: $statusWhere
    order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}]
    limit: $statusLimit
  ) {
    ...ActivityStatusFields
  }
}
    fragment ActivityFillFields on Fill {
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  takerIsBid
  takerOrder {
    owner
    side
  }
  blockNumber
  timestamp
  txHash
}
fragment ActivityRouterFields on RouterActionRecord {
  id
  kind
  market: market_id
  account
  amount
  payout
  routedVia
  blockNumber
  timestamp
  txHash
}
fragment ActivityResolutionFields on MarketResolutionEvent {
  id
  kind
  market: market_id
  outcomeIdx
  voided
  blockNumber
  timestamp
  txHash
}
fragment ActivityStatusFields on MarketStatusUpdate {
  id
  market: market_id
  oldStatus
  newStatus
  blockNumber
  timestamp
  txHash
}`) as unknown as TypedDocumentString<MarketActivityQuery, MarketActivityQueryVariables>;
export const TransactionEventsDocument = new TypedDocumentString(`
    query TransactionEvents($txHash: String!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(where: {txHash: {_eq: $txHash}}, order_by: {logIndex: asc}, limit: $limit) {
    ...ActivityFillFields
  }
  RouterActionRecord(
    where: {txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $limit
  ) {
    ...ActivityRouterFields
  }
  MarketResolutionEvent(
    where: {txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $limit
  ) {
    ...ActivityResolutionFields
  }
  MarketStatusUpdate(
    where: {txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $limit
  ) {
    ...ActivityStatusFields
  }
}
    fragment ActivityFillFields on Fill {
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  takerIsBid
  takerOrder {
    owner
    side
  }
  blockNumber
  timestamp
  txHash
}
fragment ActivityRouterFields on RouterActionRecord {
  id
  kind
  market: market_id
  account
  amount
  payout
  routedVia
  blockNumber
  timestamp
  txHash
}
fragment ActivityResolutionFields on MarketResolutionEvent {
  id
  kind
  market: market_id
  outcomeIdx
  voided
  blockNumber
  timestamp
  txHash
}
fragment ActivityStatusFields on MarketStatusUpdate {
  id
  market: market_id
  oldStatus
  newStatus
  blockNumber
  timestamp
  txHash
}`) as unknown as TypedDocumentString<TransactionEventsQuery, TransactionEventsQueryVariables>;
export const TransactionOrderAnchorDocument = new TypedDocumentString(`
    query TransactionOrderAnchor($txHash: String!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(where: {placedTxHash: {_eq: $txHash}}, order_by: {id: asc}, limit: $limit) {
    ...TransactionOrderFields
    placedAtBlock
  }
}
    fragment TransactionOrderFields on Order {
  id
  orderId
  market_id
  owner
  isBid
  side
  price
  fullQuantity
  filledQuantity
  quantityRemaining
  status
  rested
  cancelReason
  placedAtTimestamp
  placedTxHash
}`) as unknown as TypedDocumentString<TransactionOrderAnchorQuery, TransactionOrderAnchorQueryVariables>;
export const TransactionContextDocument = new TypedDocumentString(`
    query TransactionContext($txHash: String!, $timestamp: numeric!, $marketIds: [String!]!, $limit: Int!, $orderLimit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(
    where: {placedAtTimestamp: {_eq: $timestamp}, placedTxHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $orderLimit
  ) {
    ...TransactionOrderFields
  }
  ProtocolFeeRecord(
    where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $limit
  ) {
    ...ProtocolFeeFields
  }
  BuilderFeeRecord(
    where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: $limit
  ) {
    ...BuilderFeeFields
  }
  Market(where: {id: {_in: $marketIds}}) {
    ...MarketFields
  }
}
    fragment TransactionOrderFields on Order {
  id
  orderId
  market_id
  owner
  isBid
  side
  price
  fullQuantity
  filledQuantity
  quantityRemaining
  status
  rested
  cancelReason
  placedAtTimestamp
  placedTxHash
}
fragment ProtocolFeeFields on ProtocolFeeRecord {
  id
  orderId
  recipient
  payer
  token
  amount
  isTakerSide
  market: market_id
  pool
  timestamp
  txHash
}
fragment BuilderFeeFields on BuilderFeeRecord {
  id
  orderId
  builder
  payer
  token
  amount
  market: market_id
  pool
  timestamp
  txHash
}
fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<TransactionContextQuery, TransactionContextQueryVariables>;
export const BlockActivityDocument = new TypedDocumentString(`
    query BlockActivity($ts: numeric!, $blk: numeric!, $limit: Int!, $offset: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: {timestamp: {_eq: $ts}, blockNumber: {_eq: $blk}}
    order_by: {logIndex: asc}
    limit: $limit
    offset: $offset
  ) {
    ...ActivityFillFields
    makerOrder_id
    takerOrder_id
  }
  placed: Order(
    where: {placedAtTimestamp: {_eq: $ts}, placedAtBlock: {_eq: $blk}}
    order_by: {id: asc}
    limit: $limit
    offset: $offset
  ) {
    ...BlockOrderFields
  }
  touched: Order(
    where: {lastUpdatedAtTimestamp: {_eq: $ts}, lastUpdatedAtBlock: {_eq: $blk}}
    order_by: {id: asc}
    limit: $limit
    offset: $offset
  ) {
    ...BlockOrderFields
  }
}
    fragment ActivityFillFields on Fill {
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  takerIsBid
  takerOrder {
    owner
    side
  }
  blockNumber
  timestamp
  txHash
}
fragment BlockOrderFields on Order {
  id
  orderId
  market_id
  owner
  isBid
  side
  price
  fullQuantity
  cancelReason
  placedAtBlock
  placedTxHash
}`) as unknown as TypedDocumentString<BlockActivityQuery, BlockActivityQueryVariables>;
export const BlockMarketsDocument = new TypedDocumentString(`
    query BlockMarkets($marketIds: [String!]!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: {id: {_in: $marketIds}}) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<BlockMarketsQuery, BlockMarketsQueryVariables>;
export const LatestActiveTimestampDocument = new TypedDocumentString(`
    query LatestActiveTimestamp {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(order_by: {timestamp: desc}, limit: 1) {
    timestamp
  }
  placed: Order(order_by: {placedAtTimestamp: desc}, limit: 1) {
    placedAtTimestamp
  }
  touched: Order(order_by: {lastUpdatedAtTimestamp: desc}, limit: 1) {
    lastUpdatedAtTimestamp
  }
}
    `) as unknown as TypedDocumentString<LatestActiveTimestampQuery, LatestActiveTimestampQueryVariables>;
export const ActiveBlocksAtTimestampDocument = new TypedDocumentString(`
    query ActiveBlocksAtTimestamp($ts: numeric!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(where: {timestamp: {_eq: $ts}}) {
    blockNumber
  }
  placed: Order(where: {placedAtTimestamp: {_eq: $ts}}) {
    placedAtBlock
  }
  touched: Order(where: {lastUpdatedAtTimestamp: {_eq: $ts}}) {
    lastUpdatedAtBlock
  }
}
    `) as unknown as TypedDocumentString<ActiveBlocksAtTimestampQuery, ActiveBlocksAtTimestampQueryVariables>;
export const AdjacentActiveBlocksDocument = new TypedDocumentString(`
    query AdjacentActiveBlocks($ts: numeric!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  prevFill: Fill(
    where: {timestamp: {_lte: $ts}}
    order_by: {timestamp: desc}
    limit: $limit
  ) {
    blockNumber
  }
  nextFill: Fill(
    where: {timestamp: {_gte: $ts}}
    order_by: {timestamp: asc}
    limit: $limit
  ) {
    blockNumber
  }
  prevPlaced: Order(
    where: {placedAtTimestamp: {_lte: $ts}}
    order_by: {placedAtTimestamp: desc}
    limit: $limit
  ) {
    placedAtBlock
  }
  nextPlaced: Order(
    where: {placedAtTimestamp: {_gte: $ts}}
    order_by: {placedAtTimestamp: asc}
    limit: $limit
  ) {
    placedAtBlock
  }
  prevTouched: Order(
    where: {lastUpdatedAtTimestamp: {_lte: $ts}}
    order_by: {lastUpdatedAtTimestamp: desc}
    limit: $limit
  ) {
    lastUpdatedAtBlock
  }
  nextTouched: Order(
    where: {lastUpdatedAtTimestamp: {_gte: $ts}}
    order_by: {lastUpdatedAtTimestamp: asc}
    limit: $limit
  ) {
    lastUpdatedAtBlock
  }
}
    `) as unknown as TypedDocumentString<AdjacentActiveBlocksQuery, AdjacentActiveBlocksQueryVariables>;
export const PortfolioDocument = new TypedDocumentString(`
    query Portfolio($acct: String!, $fillWhere: Fill_bool_exp!, $orderWhere: Order_bool_exp!, $ordersLimit: Int, $tradesLimit: Int, $positionsLimit: Int!, $positionsOffset: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OutcomeBalance(
    where: {account: {_eq: $acct}, balance: {_gt: "0"}}
    order_by: [{balance: desc}, {id: asc}]
    limit: $positionsLimit
    offset: $positionsOffset
  ) {
    outcomeIndex
    tokenId
    balance
    market {
      ...PortfolioMarketFields
    }
  }
  ClobOrder: Order(
    where: $orderWhere
    order_by: {placedAtTimestamp: desc}
    limit: $ordersLimit
  ) {
    id
    orderId
    side
    price
    quantityRemaining
    filledQuantity
    fullQuantity
    placedAtTimestamp
    placedTxHash
    market {
      ...PortfolioMarketFields
    }
  }
  ClobFill: Fill(
    where: $fillWhere
    order_by: {timestamp: desc}
    limit: $tradesLimit
  ) {
    id
    fillPrice
    quantity
    timestamp
    txHash
    maker
    makerSide
    takerOrder {
      owner
      side
    }
    market {
      marketAddress
      asset
      quoteDecimals
    }
  }
}
    fragment PortfolioMarketFields on Market {
  id
  marketAddress
  poolAddress
  asset
  question
  status: clobStatus
  lastPrice
  strike
  expiry
  winningOutcome
  voided
  payoutNumerators
  payoutDenominator
  quoteDecimals
  intervalSec
}`) as unknown as TypedDocumentString<PortfolioQuery, PortfolioQueryVariables>;
export const OutcomeBalancesDocument = new TypedDocumentString(`
    query OutcomeBalances($acct: String!, $mkt: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OutcomeBalance(
    where: {account: {_eq: $acct}, market: {marketAddress: {_eq: $mkt}}}
  ) {
    outcomeIndex
    balance
  }
}
    `) as unknown as TypedDocumentString<OutcomeBalancesQuery, OutcomeBalancesQueryVariables>;
export const VaultPayoutFallbacksDocument = new TypedDocumentString(`
    query VaultPayoutFallbacks($where: VaultPayoutFallback_bool_exp!, $orderBy: [VaultPayoutFallback_order_by!], $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  VaultPayoutFallback(
    where: $where
    order_by: $orderBy
    limit: $limit
    offset: $offset
  ) {
    id
    owner
    token
    amount
    marketId: market_id
    market {
      poolAddress
    }
    timestamp
    txHash
  }
}
    `) as unknown as TypedDocumentString<VaultPayoutFallbacksQuery, VaultPayoutFallbacksQueryVariables>;
export const MarketResolutionDocument = new TypedDocumentString(`
    query MarketResolution($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketResolutionEvent(
    where: {market_id: {_eq: $id}}
    order_by: {timestamp: asc}
  ) {
    id
    market: market_id
    kind
    winningOutcome: outcomeIdx
    payoutNumerators
    payoutDenominator
    voided
    blockNumber
    timestamp
    txHash
  }
  MarketReferenceLink(where: {market_id: {_eq: $id}}, limit: 1) {
    id
    market: market_id
    oracleQuestionId: referenceQuestionId
    pending
    blockNumber
    timestamp
  }
  Market_by_pk(id: $id) {
    oracleQuestionId
  }
}
    `) as unknown as TypedDocumentString<MarketResolutionQuery, MarketResolutionQueryVariables>;
export const OracleAnswersDocument = new TypedDocumentString(`
    query OracleAnswers($closingQid: String!, $openingQid: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  closing: OracleAnswer_by_pk(id: $closingQid) {
    oracleQuestionId
    numericValue
    outcomeLabel
    voidReason
    resolvedAt
    txHash
  }
  opening: OracleAnswer_by_pk(id: $openingQid) {
    oracleQuestionId
    numericValue
    outcomeLabel
    voidReason
    resolvedAt
    txHash
  }
}
    `) as unknown as TypedDocumentString<OracleAnswersQuery, OracleAnswersQueryVariables>;
export const MarketResolutionEventsDocument = new TypedDocumentString(`
    query MarketResolutionEvents($where: MarketResolutionEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketResolutionEvent(
    where: $where
    order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    market: market_id
    kind
    winningOutcome: outcomeIdx
    payoutNumerators
    payoutDenominator
    voided
    blockNumber
    timestamp
    txHash
  }
}
    `) as unknown as TypedDocumentString<MarketResolutionEventsQuery, MarketResolutionEventsQueryVariables>;
export const MarketReferenceLinksDocument = new TypedDocumentString(`
    query MarketReferenceLinks($where: MarketReferenceLink_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketReferenceLink(
    where: $where
    order_by: [{timestamp: asc}, {id: asc}]
    limit: $limit
    offset: $offset
  ) {
    id
    market: market_id
    oracleQuestionId: referenceQuestionId
    pending
    blockNumber
    timestamp
  }
}
    `) as unknown as TypedDocumentString<MarketReferenceLinksQuery, MarketReferenceLinksQueryVariables>;
export const CandlesDocument = new TypedDocumentString(`
    query Candles($where: Candle_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Candle(where: $where, order_by: [{bucketStart: desc}], limit: $limit) {
    bucketStart
    openPrice
    high
    low
    closePrice
    baseVolume
    quoteVolume
    tradeCount
    lastFillId
  }
}
    `) as unknown as TypedDocumentString<CandlesQuery, CandlesQueryVariables>;
export const BuilderApprovalsDocument = new TypedDocumentString(`
    query BuilderApprovals($where: BuilderApproval_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  BuilderApproval(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    market_id
    market {
      poolAddress
    }
    user
    builder
    maxFeeBpsTimes1k
    blockNumber
    timestamp
    txHash
  }
}
    `) as unknown as TypedDocumentString<BuilderApprovalsQuery, BuilderApprovalsQueryVariables>;
export const ProtocolFeesDocument = new TypedDocumentString(`
    query ProtocolFees($where: ProtocolFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  ProtocolFeeRecord(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...ProtocolFeeFields
  }
}
    fragment ProtocolFeeFields on ProtocolFeeRecord {
  id
  orderId
  recipient
  payer
  token
  amount
  isTakerSide
  market: market_id
  pool
  timestamp
  txHash
}`) as unknown as TypedDocumentString<ProtocolFeesQuery, ProtocolFeesQueryVariables>;
export const BuilderFeesDocument = new TypedDocumentString(`
    query BuilderFees($where: BuilderFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  BuilderFeeRecord(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...BuilderFeeFields
  }
}
    fragment BuilderFeeFields on BuilderFeeRecord {
  id
  orderId
  builder
  payer
  token
  amount
  market: market_id
  pool
  timestamp
  txHash
}`) as unknown as TypedDocumentString<BuilderFeesQuery, BuilderFeesQueryVariables>;
export const SettlementFeesDocument = new TypedDocumentString(`
    query SettlementFees($where: SettlementFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  SettlementFeeRecord(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...SettlementFeeFields
  }
}
    fragment SettlementFeeFields on SettlementFeeRecord {
  id
  recipient: feeRecipient
  amount: fee
  winningBacking
  market: market_id
  timestamp
  txHash
}`) as unknown as TypedDocumentString<SettlementFeesQuery, SettlementFeesQueryVariables>;
export const FillsDocument = new TypedDocumentString(`
    query Fills($where: Fill_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: $where
    order_by: [{timestamp: desc}, {blockNumber: desc}]
    limit: $limit
    offset: $offset
  ) {
    ...FillQueryFields
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}`) as unknown as TypedDocumentString<FillsQuery, FillsQueryVariables>;
export const UserFillsDocument = new TypedDocumentString(`
    query UserFills($where: Fill_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: $where
    order_by: [{timestamp: desc}, {blockNumber: desc}]
    limit: $limit
    offset: $offset
  ) {
    ...FillQueryFields
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}`) as unknown as TypedDocumentString<UserFillsQuery, UserFillsQueryVariables>;
export const FillsRangePageDocument = new TypedDocumentString(`
    query FillsRangePage($where: Fill_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: $where
    order_by: [{blockNumber: asc}, {logIndex: asc}]
    limit: $limit
  ) {
    ...FillQueryFields
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}`) as unknown as TypedDocumentString<FillsRangePageQuery, FillsRangePageQueryVariables>;
export const LatestFillBlockDocument = new TypedDocumentString(`
    query LatestFillBlock($marketType: markettype!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: {marketType: {_eq: $marketType}}
    order_by: [{blockNumber: desc}]
    limit: 1
  ) {
    blockNumber
    timestamp
  }
}
    `) as unknown as TypedDocumentString<LatestFillBlockQuery, LatestFillBlockQueryVariables>;
export const UserFillsPageDocument = new TypedDocumentString(`
    query UserFillsPage($where: Fill_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  FillDataset_by_pk(id: "current") {
    generation
  }
  Fill(
    where: $where
    order_by: [{timestamp: desc}, {blockNumber: desc}, {logIndex: desc}]
    limit: $limit
  ) {
    ...FillQueryFields
    blockNumber
    logIndex
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}`) as unknown as TypedDocumentString<UserFillsPageQuery, UserFillsPageQueryVariables>;
export const FillDetailDocument = new TypedDocumentString(`
    query FillDetail($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(where: {id: {_eq: $id}}, limit: 1) {
    ...FillQueryFields
    blockNumber
    logIndex
    marketRef: market {
      ...MarketRefFields
    }
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}
fragment MarketRefFields on Market {
  id
  marketType
  poolAddress
  marketAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  asset
  question
}`) as unknown as TypedDocumentString<FillDetailQuery, FillDetailQueryVariables>;
export const OrderFillsDocument = new TypedDocumentString(`
    query OrderFills($pool: String!, $oid: numeric!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: {pool: {_eq: $pool}, _or: [{takerOrderId: {_eq: $oid}}, {makerOrderId: {_eq: $oid}}]}
    order_by: [{timestamp: desc}, {blockNumber: desc}]
    limit: $limit
  ) {
    ...FillQueryFields
    blockNumber
    logIndex
  }
}
    fragment FillQueryFields on Fill {
  blockNumber
  logIndex
  id
  market: market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  timestamp
  txHash
  takerOrder {
    owner
    side
  }
}`) as unknown as TypedDocumentString<OrderFillsQuery, OrderFillsQueryVariables>;
export const TradeContextDocument = new TypedDocumentString(`
    query TradeContext($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill_by_pk(id: $id) {
    ...TradeContextFillFields
    market {
      ...MarketFields
    }
    makerOrder {
      ...FillOrderFields
    }
    takerOrder {
      ...FillOrderFields
    }
  }
}
    fragment TradeContextFillFields on Fill {
  id
  market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  takerOrder {
    owner
    side
  }
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  blockNumber
  timestamp
  logIndex
  txHash
}
fragment FillOrderFields on Order {
  id
  orderId
  owner
  isBid
  side
  price
  fullQuantity
  filledQuantity
  quantityRemaining
  status
  rested
  cancelReason
  placedAtTimestamp
  placedTxHash
}
fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<TradeContextQuery, TradeContextQueryVariables>;
export const FillTxContextDocument = new TypedDocumentString(`
    query FillTxContext($timestamp: numeric!, $txHash: String!, $market: String!, $id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Fill(
    where: {timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}, id: {_neq: $id}}
    order_by: [{blockNumber: desc}, {logIndex: desc}]
    limit: 100
  ) {
    ...TradeContextFillFields
  }
  ProtocolFeeRecord(
    where: {market_id: {_eq: $market}, timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: 100
  ) {
    ...ProtocolFeeFields
  }
  BuilderFeeRecord(
    where: {market_id: {_eq: $market}, timestamp: {_eq: $timestamp}, txHash: {_eq: $txHash}}
    order_by: {id: asc}
    limit: 100
  ) {
    ...BuilderFeeFields
  }
}
    fragment ProtocolFeeFields on ProtocolFeeRecord {
  id
  orderId
  recipient
  payer
  token
  amount
  isTakerSide
  market: market_id
  pool
  timestamp
  txHash
}
fragment BuilderFeeFields on BuilderFeeRecord {
  id
  orderId
  builder
  payer
  token
  amount
  market: market_id
  pool
  timestamp
  txHash
}
fragment TradeContextFillFields on Fill {
  id
  market_id
  pool
  fillPrice
  quantity
  quoteQuantity
  maker
  makerSide
  taker
  takerSide
  kind
  takerIsBid
  takerOrder {
    owner
    side
  }
  makerOrderId
  takerOrderId
  takerRemainingQuantity
  makerRemainingQuantity
  blockNumber
  timestamp
  logIndex
  txHash
}`) as unknown as TypedDocumentString<FillTxContextQuery, FillTxContextQueryVariables>;
export const FillCountDocument = new TypedDocumentString(`
    query FillCount($where: Fill_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  total: Fill_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
    `) as unknown as TypedDocumentString<FillCountQuery, FillCountQueryVariables>;
export const FillCountFallbackDocument = new TypedDocumentString(`
    query FillCountFallback($where: Fill_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  rows: Fill(where: $where, limit: $limit) {
    id
  }
}
    `) as unknown as TypedDocumentString<FillCountFallbackQuery, FillCountFallbackQueryVariables>;
export const MarketCreatorsDocument = new TypedDocumentString(`
    query MarketCreators($where: MarketCreator_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketCreator(
    where: $where
    order_by: {createdAtBlock: desc}
    limit: $limit
    offset: $offset
  ) {
    ...MarketCreatorFields
    series(order_by: {seriesId: asc}) {
      ...SeriesFields
    }
  }
}
    fragment SeriesFields on Series {
  id
  creatorAddress
  seriesId
  collateral
  asset
  intervalSec
  createdAtTimestamp
  updatedAtTimestamp
}
fragment MarketCreatorFields on MarketCreator {
  id
  owner
  policy
  core
  adapter
  operatorId
  venueId
  factory
  createdAtBlock
  createdAtTimestamp
}`) as unknown as TypedDocumentString<MarketCreatorsQuery, MarketCreatorsQueryVariables>;
export const MarketCreatorByPkDocument = new TypedDocumentString(`
    query MarketCreatorByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketCreator_by_pk(id: $id) {
    ...MarketCreatorFields
    series(order_by: {seriesId: asc}) {
      ...SeriesFields
    }
  }
}
    fragment SeriesFields on Series {
  id
  creatorAddress
  seriesId
  collateral
  asset
  intervalSec
  createdAtTimestamp
  updatedAtTimestamp
}
fragment MarketCreatorFields on MarketCreator {
  id
  owner
  policy
  core
  adapter
  operatorId
  venueId
  factory
  createdAtBlock
  createdAtTimestamp
}`) as unknown as TypedDocumentString<MarketCreatorByPkQuery, MarketCreatorByPkQueryVariables>;
export const OracleAdaptersDocument = new TypedDocumentString(`
    query OracleAdapters($where: OracleAdapter_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleAdapter(
    where: $where
    order_by: {createdAtTimestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...OracleAdapterFields
  }
}
    fragment OracleAdapterFields on OracleAdapter {
  id
  owner
  factory
  approved
  approvedAtTimestamp
  createdAtTimestamp
}`) as unknown as TypedDocumentString<OracleAdaptersQuery, OracleAdaptersQueryVariables>;
export const OracleAdapterByPkDocument = new TypedDocumentString(`
    query OracleAdapterByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleAdapter_by_pk(id: $id) {
    ...OracleAdapterFields
  }
}
    fragment OracleAdapterFields on OracleAdapter {
  id
  owner
  factory
  approved
  approvedAtTimestamp
  createdAtTimestamp
}`) as unknown as TypedDocumentString<OracleAdapterByPkQuery, OracleAdapterByPkQueryVariables>;
export const SeriesByIdDocument = new TypedDocumentString(`
    query SeriesById($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Series(where: {id: {_eq: $id}}, limit: 1) {
    ...SeriesFields
  }
}
    fragment SeriesFields on Series {
  id
  creatorAddress
  seriesId
  collateral
  asset
  intervalSec
  createdAtTimestamp
  updatedAtTimestamp
}`) as unknown as TypedDocumentString<SeriesByIdQuery, SeriesByIdQueryVariables>;
export const SeriesListDocument = new TypedDocumentString(`
    query SeriesList($where: Series_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Series(
    where: $where
    order_by: {createdAtTimestamp: asc}
    limit: $limit
    offset: $offset
  ) {
    ...SeriesFields
  }
}
    fragment SeriesFields on Series {
  id
  creatorAddress
  seriesId
  collateral
  asset
  intervalSec
  createdAtTimestamp
  updatedAtTimestamp
}`) as unknown as TypedDocumentString<SeriesListQuery, SeriesListQueryVariables>;
export const SeriesLatestMarketsDocument = new TypedDocumentString(`
    query SeriesLatestMarkets($limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: {series_id: {_is_null: false}}
    distinct_on: series_id
    order_by: [{series_id: asc}, {createdAtTimestamp: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    series_id
    createdAtTimestamp
  }
}
    `) as unknown as TypedDocumentString<SeriesLatestMarketsQuery, SeriesLatestMarketsQueryVariables>;
export const RegistryMarketsDocument = new TypedDocumentString(`
    query RegistryMarkets($where: Market_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: $where
    order_by: [{createdAtTimestamp: desc}, {id: desc}]
    limit: $limit
  ) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<RegistryMarketsQuery, RegistryMarketsQueryVariables>;
export const ResolvableMarketsDocument = new TypedDocumentString(`
    query ResolvableMarkets($id0: String! = "", $use0: Boolean! = false, $id1: String! = "", $use1: Boolean! = false, $id2: String! = "", $use2: Boolean! = false, $id3: String! = "", $use3: Boolean! = false, $id4: String! = "", $use4: Boolean! = false, $id5: String! = "", $use5: Boolean! = false, $id6: String! = "", $use6: Boolean! = false, $id7: String! = "", $use7: Boolean! = false, $id8: String! = "", $use8: Boolean! = false, $id9: String! = "", $use9: Boolean! = false, $id10: String! = "", $use10: Boolean! = false, $id11: String! = "", $use11: Boolean! = false, $id12: String! = "", $use12: Boolean! = false, $id13: String! = "", $use13: Boolean! = false, $id14: String! = "", $use14: Boolean! = false, $id15: String! = "", $use15: Boolean! = false, $id16: String! = "", $use16: Boolean! = false, $id17: String! = "", $use17: Boolean! = false, $id18: String! = "", $use18: Boolean! = false, $id19: String! = "", $use19: Boolean! = false, $id20: String! = "", $use20: Boolean! = false, $id21: String! = "", $use21: Boolean! = false, $id22: String! = "", $use22: Boolean! = false, $id23: String! = "", $use23: Boolean! = false, $id24: String! = "", $use24: Boolean! = false) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  market0: Market_by_pk(id: $id0) @include(if: $use0) {
    ...MarketFields
  }
  market1: Market_by_pk(id: $id1) @include(if: $use1) {
    ...MarketFields
  }
  market2: Market_by_pk(id: $id2) @include(if: $use2) {
    ...MarketFields
  }
  market3: Market_by_pk(id: $id3) @include(if: $use3) {
    ...MarketFields
  }
  market4: Market_by_pk(id: $id4) @include(if: $use4) {
    ...MarketFields
  }
  market5: Market_by_pk(id: $id5) @include(if: $use5) {
    ...MarketFields
  }
  market6: Market_by_pk(id: $id6) @include(if: $use6) {
    ...MarketFields
  }
  market7: Market_by_pk(id: $id7) @include(if: $use7) {
    ...MarketFields
  }
  market8: Market_by_pk(id: $id8) @include(if: $use8) {
    ...MarketFields
  }
  market9: Market_by_pk(id: $id9) @include(if: $use9) {
    ...MarketFields
  }
  market10: Market_by_pk(id: $id10) @include(if: $use10) {
    ...MarketFields
  }
  market11: Market_by_pk(id: $id11) @include(if: $use11) {
    ...MarketFields
  }
  market12: Market_by_pk(id: $id12) @include(if: $use12) {
    ...MarketFields
  }
  market13: Market_by_pk(id: $id13) @include(if: $use13) {
    ...MarketFields
  }
  market14: Market_by_pk(id: $id14) @include(if: $use14) {
    ...MarketFields
  }
  market15: Market_by_pk(id: $id15) @include(if: $use15) {
    ...MarketFields
  }
  market16: Market_by_pk(id: $id16) @include(if: $use16) {
    ...MarketFields
  }
  market17: Market_by_pk(id: $id17) @include(if: $use17) {
    ...MarketFields
  }
  market18: Market_by_pk(id: $id18) @include(if: $use18) {
    ...MarketFields
  }
  market19: Market_by_pk(id: $id19) @include(if: $use19) {
    ...MarketFields
  }
  market20: Market_by_pk(id: $id20) @include(if: $use20) {
    ...MarketFields
  }
  market21: Market_by_pk(id: $id21) @include(if: $use21) {
    ...MarketFields
  }
  market22: Market_by_pk(id: $id22) @include(if: $use22) {
    ...MarketFields
  }
  market23: Market_by_pk(id: $id23) @include(if: $use23) {
    ...MarketFields
  }
  market24: Market_by_pk(id: $id24) @include(if: $use24) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<ResolvableMarketsQuery, ResolvableMarketsQueryVariables>;
export const MarketsDocument = new TypedDocumentString(`
    query Markets($where: Market_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: $where
    order_by: {createdAtTimestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<MarketsQuery, MarketsQueryVariables>;
export const MarketByPkDocument = new TypedDocumentString(`
    query MarketByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market_by_pk(id: $id) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<MarketByPkQuery, MarketByPkQueryVariables>;
export const MarketByAddressDocument = new TypedDocumentString(`
    query MarketByAddress($a: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: {marketAddress: {_eq: $a}}
    order_by: {createdAtTimestamp: desc}
    limit: 1
  ) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<MarketByAddressQuery, MarketByAddressQueryVariables>;
export const BinaryMarketsDocument = new TypedDocumentString(`
    query BinaryMarkets($where: Market_bool_exp!, $orderBy: [Market_order_by!], $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<BinaryMarketsQuery, BinaryMarketsQueryVariables>;
export const SpotMarketsDocument = new TypedDocumentString(`
    query SpotMarkets($where: Market_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: $where, order_by: {createdAtTimestamp: desc}, limit: $limit) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<SpotMarketsQuery, SpotMarketsQueryVariables>;
export const PerpMarketsDocument = new TypedDocumentString(`
    query PerpMarkets($where: Market_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: $where, order_by: {createdAtTimestamp: desc}, limit: $limit) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<PerpMarketsQuery, PerpMarketsQueryVariables>;
export const LiveBinaryMarketsDocument = new TypedDocumentString(`
    query LiveBinaryMarkets($where: Market_bool_exp!, $orderBy: [Market_order_by!], $limit: Int!, $offset: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<LiveBinaryMarketsQuery, LiveBinaryMarketsQueryVariables>;
export const PastBinaryMarketsDocument = new TypedDocumentString(`
    query PastBinaryMarkets($where: Market_bool_exp!, $limit: Int!, $offset: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: $where, order_by: {expiry: desc}, limit: $limit, offset: $offset) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<PastBinaryMarketsQuery, PastBinaryMarketsQueryVariables>;
export const BinaryOriginPairsDocument = new TypedDocumentString(`
    query BinaryOriginPairs {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    distinct_on: [operatorId, venueId]
    where: {marketType: {_eq: "BINARY"}, operatorId: {_is_null: false}, venueId: {_is_null: false}}
    order_by: [{operatorId: asc}, {venueId: asc}]
  ) {
    operatorId
    venueId
  }
}
    `) as unknown as TypedDocumentString<BinaryOriginPairsQuery, BinaryOriginPairsQueryVariables>;
export const BinaryAssetsDocument = new TypedDocumentString(`
    query BinaryAssets {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    distinct_on: asset
    where: {marketType: {_eq: "BINARY"}, asset: {_is_null: false}}
    order_by: {asset: asc}
  ) {
    asset
  }
}
    `) as unknown as TypedDocumentString<BinaryAssetsQuery, BinaryAssetsQueryVariables>;
export const MarketFeesDocument = new TypedDocumentString(`
    query MarketFees($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketVenue_by_pk(id: $id) {
    operatorId
    venueId
    feeRecipient
    makerFeeBps
    takerFeeBps
    maxBuilderFeeBps
    routingFeeBps
    settlementFeeBps
    settlementFeesCollected
  }
}
    `) as unknown as TypedDocumentString<MarketFeesQuery, MarketFeesQueryVariables>;
export const MarketStatusHistoryDocument = new TypedDocumentString(`
    query MarketStatusHistory($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketStatusUpdate(where: {market_id: {_eq: $id}}, order_by: {timestamp: asc}) {
    oldStatus
    newStatus
    blockNumber
    timestamp
    txHash
  }
}
    `) as unknown as TypedDocumentString<MarketStatusHistoryQuery, MarketStatusHistoryQueryVariables>;
export const OracleAnswersByQidDocument = new TypedDocumentString(`
    query OracleAnswersByQid($qids: [String!]) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleAnswer(where: {id: {_in: $qids}}) {
    id
    numericValue
    voided
  }
}
    `) as unknown as TypedDocumentString<OracleAnswersByQidQuery, OracleAnswersByQidQueryVariables>;
export const ResolutionQidsDocument = new TypedDocumentString(`
    query ResolutionQids($ids: [String!]) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(where: {id: {_in: $ids}}) {
    id
    oracleQuestionId
  }
}
    `) as unknown as TypedDocumentString<ResolutionQidsQuery, ResolutionQidsQueryVariables>;
export const OpeningRefsDocument = new TypedDocumentString(`
    query OpeningRefs($ids: [String!]) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarketReferenceLink(where: {market_id: {_in: $ids}}) {
    market: market_id
    referenceQuestionId
  }
}
    `) as unknown as TypedDocumentString<OpeningRefsQuery, OpeningRefsQueryVariables>;
export const MarketCountDocument = new TypedDocumentString(`
    query MarketCount($where: Market_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  total: Market_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
    `) as unknown as TypedDocumentString<MarketCountQuery, MarketCountQueryVariables>;
export const MarketCountFallbackDocument = new TypedDocumentString(`
    query MarketCountFallback($where: Market_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  rows: Market(where: $where, limit: $limit) {
    id
  }
}
    `) as unknown as TypedDocumentString<MarketCountFallbackQuery, MarketCountFallbackQueryVariables>;
export const OperatorsDocument = new TypedDocumentString(`
    query Operators($where: Operator_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Operator(
    where: $where
    order_by: {operatorId: desc}
    limit: $limit
    offset: $offset
  ) {
    ...OperatorFields
  }
}
    fragment OperatorFields on Operator {
  operatorId
  owner
  feeRecipient
  enabled
  policy
  context
  pendingOwner
  venueCount
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}`) as unknown as TypedDocumentString<OperatorsQuery, OperatorsQueryVariables>;
export const OperatorByPkDocument = new TypedDocumentString(`
    query OperatorByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Operator_by_pk(id: $id) {
    ...OperatorFields
  }
}
    fragment OperatorFields on Operator {
  operatorId
  owner
  feeRecipient
  enabled
  policy
  context
  pendingOwner
  venueCount
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}`) as unknown as TypedDocumentString<OperatorByPkQuery, OperatorByPkQueryVariables>;
export const VenuesDocument = new TypedDocumentString(`
    query Venues($where: Venue_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Venue(
    where: $where
    order_by: {createdAtTimestamp: asc}
    limit: $limit
    offset: $offset
  ) {
    ...VenueFields
  }
}
    fragment VenueFields on Venue {
  venueId
  operatorId
  marketType
  feeParams
  feeRecipientOverride
  policy
  signer
  creationEnabled
  context
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}`) as unknown as TypedDocumentString<VenuesQuery, VenuesQueryVariables>;
export const VenueByPkDocument = new TypedDocumentString(`
    query VenueByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Venue_by_pk(id: $id) {
    ...VenueFields
  }
}
    fragment VenueFields on Venue {
  venueId
  operatorId
  marketType
  feeParams
  feeRecipientOverride
  policy
  signer
  creationEnabled
  context
  createdAtTimestamp
  updatedAtTimestamp
  updatedAtBlock
  marketCount
  cumulativeQuoteVolume
  protocolFeesCollected
  settlementFeesCollected
  builderFeesCollected
}`) as unknown as TypedDocumentString<VenueByPkQuery, VenueByPkQueryVariables>;
export const OperatorCountDocument = new TypedDocumentString(`
    query OperatorCount($where: Operator_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  total: Operator_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
    `) as unknown as TypedDocumentString<OperatorCountQuery, OperatorCountQueryVariables>;
export const OperatorCountFallbackDocument = new TypedDocumentString(`
    query OperatorCountFallback($where: Operator_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  rows: Operator(where: $where, limit: $limit) {
    id
  }
}
    `) as unknown as TypedDocumentString<OperatorCountFallbackQuery, OperatorCountFallbackQueryVariables>;
export const VenueCountDocument = new TypedDocumentString(`
    query VenueCount($where: Venue_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  total: Venue_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
    `) as unknown as TypedDocumentString<VenueCountQuery, VenueCountQueryVariables>;
export const VenueCountFallbackDocument = new TypedDocumentString(`
    query VenueCountFallback($where: Venue_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  rows: Venue(where: $where, limit: $limit) {
    id
  }
}
    `) as unknown as TypedDocumentString<VenueCountFallbackQuery, VenueCountFallbackQueryVariables>;
export const OracleQuestionDocument = new TypedDocumentString(`
    query OracleQuestion($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleQuestion_by_pk(id: $id) {
    ...OracleQuestionFields
  }
}
    fragment OracleQuestionFields on OracleQuestion {
  id
  questionKey
  scheduler
  oracleCost
  bindCount
  reuseCount
  createdAtBlock
  createdAtTimestamp
}`) as unknown as TypedDocumentString<OracleQuestionQuery, OracleQuestionQueryVariables>;
export const OracleQuestionsDocument = new TypedDocumentString(`
    query OracleQuestions($where: OracleQuestion_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleQuestion(
    where: $where
    order_by: {createdAtTimestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...OracleQuestionFields
  }
}
    fragment OracleQuestionFields on OracleQuestion {
  id
  questionKey
  scheduler
  oracleCost
  bindCount
  reuseCount
  createdAtBlock
  createdAtTimestamp
}`) as unknown as TypedDocumentString<OracleQuestionsQuery, OracleQuestionsQueryVariables>;
export const OperatorHubAccountDocument = new TypedDocumentString(`
    query OperatorHubAccount($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OperatorHubAccount_by_pk(id: $id) {
    ...OperatorHubAccountFields
  }
}
    fragment OperatorHubAccountFields on OperatorHubAccount {
  id
  operatorId
  earmarked
  credit
  outstanding
  createdAtBlock
  createdAtTimestamp
  updatedAtBlock
  updatedAtTimestamp
}`) as unknown as TypedDocumentString<OperatorHubAccountQuery, OperatorHubAccountQueryVariables>;
export const OperatorHubAccountsDocument = new TypedDocumentString(`
    query OperatorHubAccounts($limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OperatorHubAccount(
    order_by: {updatedAtTimestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...OperatorHubAccountFields
  }
}
    fragment OperatorHubAccountFields on OperatorHubAccount {
  id
  operatorId
  earmarked
  credit
  outstanding
  createdAtBlock
  createdAtTimestamp
  updatedAtBlock
  updatedAtTimestamp
}`) as unknown as TypedDocumentString<OperatorHubAccountsQuery, OperatorHubAccountsQueryVariables>;
export const OracleBindsDocument = new TypedDocumentString(`
    query OracleBinds($where: OracleBind_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleBind(
    where: $where
    order_by: {boundAtTimestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...OracleBindFields
  }
}
    fragment OracleBindFields on OracleBind {
  id
  oracleQuestionId
  bindIndex
  operatorId
  measuredGas
  overheadShare
  cost
  charged
  subsidy
  resolvedAt
  boundAtBlock
  boundAtTimestamp
  txHash
}`) as unknown as TypedDocumentString<OracleBindsQuery, OracleBindsQueryVariables>;
export const OracleCallbacksDocument = new TypedDocumentString(`
    query OracleCallbacks($limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OracleCallback(order_by: {timestamp: desc}, limit: $limit, offset: $offset) {
    ...OracleCallbackFields
  }
}
    fragment OracleCallbackFields on OracleCallback {
  id
  marketsResolved
  gasPrice
  measuredGas
  overheadGasAttributed
  totalCost
  totalCharged
  subsidy
  pendingRemaining
  blockNumber
  timestamp
  txHash
}`) as unknown as TypedDocumentString<OracleCallbacksQuery, OracleCallbacksQueryVariables>;
export const SweepableOrdersDocument = new TypedDocumentString(`
    query SweepableOrders($where: Order_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(
    where: $where
    order_by: [{expireTimestampNs: asc}, {id: asc}]
    limit: $limit
    offset: $offset
  ) {
    id
    orderId
    owner
    isBid
    price
    quantityRemaining
    expireTimestampNs
    placedAtTimestamp
    market: market_id
    marketRow: market {
      poolAddress
      marketType
      ...OrderMarketFields
    }
  }
}
    fragment OrderMarketFields on Market {
  marketAddress
  asset
  question
  expiry
  tradingStart
  quoteDecimals
  intervalSec
}`) as unknown as TypedDocumentString<SweepableOrdersQuery, SweepableOrdersQueryVariables>;
export const OpenOrdersDocument = new TypedDocumentString(`
    query OpenOrders($where: Order_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(
    where: $where
    order_by: [{placedAtTimestamp: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    orderId
    userData
    side
    isBid
    price
    quantityRemaining
    market: market_id
    marketRow: market {
      poolAddress
      ...OrderMarketFields
    }
  }
}
    fragment OrderMarketFields on Market {
  marketAddress
  asset
  question
  expiry
  tradingStart
  quoteDecimals
  intervalSec
}`) as unknown as TypedDocumentString<OpenOrdersQuery, OpenOrdersQueryVariables>;
export const OrdersDocument = new TypedDocumentString(`
    query Orders($where: Order_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(
    where: $where
    order_by: [{placedAtTimestamp: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    orderId
    userData
    side
    isBid
    price
    quantityRemaining
    fullQuantity
    filledQuantity
    status
    rested
    expireTimestampNs
    placedTxHash
    placedAtTimestamp
    cancelReason
    amendedFromOrderId
    amendedToOrderId
    market: market_id
    marketRow: market {
      poolAddress
      ...OrderMarketFields
    }
  }
}
    fragment OrderMarketFields on Market {
  marketAddress
  asset
  question
  expiry
  tradingStart
  quoteDecimals
  intervalSec
}`) as unknown as TypedDocumentString<OrdersQuery, OrdersQueryVariables>;
export const OrderDetailDocument = new TypedDocumentString(`
    query OrderDetail($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(where: {id: {_eq: $id}}, limit: 1) {
    id
    orderId
    owner
    userData
    side
    isBid
    price
    quantityRemaining
    fullQuantity
    filledQuantity
    status
    rested
    expireTimestampNs
    placedTxHash
    placedAtTimestamp
    placedAtBlock
    lastUpdatedAtTimestamp
    cancelReason
    amendedFromOrderId
    amendedToOrderId
    market: market_id
    marketRow: market {
      poolAddress
      ...OrderMarketFields
    }
    marketRef: market {
      ...MarketRefFields
    }
  }
}
    fragment MarketRefFields on Market {
  id
  marketType
  poolAddress
  marketAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  asset
  question
}
fragment OrderMarketFields on Market {
  marketAddress
  asset
  question
  expiry
  tradingStart
  quoteDecimals
  intervalSec
}`) as unknown as TypedDocumentString<OrderDetailQuery, OrderDetailQueryVariables>;
export const BookTopsDocument = new TypedDocumentString(`
    query BookTops($bidWhere: Order_bool_exp!, $askWhere: Order_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  bids: Order(
    where: $bidWhere
    distinct_on: market_id
    order_by: [{market_id: desc}, {price: desc}]
  ) {
    market: market_id
    price
  }
  asks: Order(
    where: $askWhere
    distinct_on: market_id
    order_by: [{market_id: asc}, {price: asc}]
  ) {
    market: market_id
    price
  }
}
    `) as unknown as TypedDocumentString<BookTopsQuery, BookTopsQueryVariables>;
export const OrderCountDocument = new TypedDocumentString(`
    query OrderCount($where: Order_bool_exp!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  total: Order_aggregate(where: $where) {
    aggregate {
      count
    }
  }
}
    `) as unknown as TypedDocumentString<OrderCountQuery, OrderCountQueryVariables>;
export const OrderCountFallbackDocument = new TypedDocumentString(`
    query OrderCountFallback($where: Order_bool_exp!, $limit: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  rows: Order(where: $where, limit: $limit) {
    id
  }
}
    `) as unknown as TypedDocumentString<OrderCountFallbackQuery, OrderCountFallbackQueryVariables>;
export const FundingPaymentsDocument = new TypedDocumentString(`
    query FundingPayments($where: FundingPayment_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  FundingPayment(
    where: $where
    order_by: [{timestamp: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    account
    pool
    amount
    timestamp
    txHash
  }
}
    `) as unknown as TypedDocumentString<FundingPaymentsQuery, FundingPaymentsQueryVariables>;
export const MarginEventsDocument = new TypedDocumentString(`
    query MarginEvents($where: MarginEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  MarginEvent(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    account
    kind
    pool
    amount
    granter
    timestamp
    txHash
  }
}
    `) as unknown as TypedDocumentString<MarginEventsQuery, MarginEventsQueryVariables>;
export const LiquidationsDocument = new TypedDocumentString(`
    query Liquidations($where: LiquidationEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  LiquidationEvent(
    where: $where
    order_by: [{timestamp: desc}, {blockNumber: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    account
    pool
    kind
    size
    price
    counterparty
    penalty
    badDebt
    insuranceCovered
    deficit
    coverageDeclined
    collateralAmount
    equity
    positionsProcessed
    stageReached
    marginStatusBefore
    marginStatusAfter
    timestamp
    blockNumber
    txHash
  }
}
    `) as unknown as TypedDocumentString<LiquidationsQuery, LiquidationsQueryVariables>;
export const FundingRateHistoryDocument = new TypedDocumentString(`
    query FundingRateHistory($where: FundingRateUpdate_bool_exp!, $orderBy: [FundingRateUpdate_order_by!], $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  FundingRateUpdate(
    where: $where
    order_by: $orderBy
    limit: $limit
    offset: $offset
  ) {
    id
    pool
    fundingRate
    cumulativeFundingPerUnit
    indexPrice
    markPrice
    intervalsSettled
    intervalsAccrued
    fundingWindowSec
    fundingIntervalSec
    spanStart
    spanEnd
    anchorResynced
    timestamp
    blockNumber
    txHash
  }
}
    `) as unknown as TypedDocumentString<FundingRateHistoryQuery, FundingRateHistoryQueryVariables>;
export const FundingRateCandlesDocument = new TypedDocumentString(`
    query FundingRateCandles($where: FundingRateCandle_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  FundingRateCandle(
    where: $where
    order_by: {bucketStart: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    pool
    intervalSeconds
    bucketStart
    avgFundingRate8h
    minFundingRate8h
    maxFundingRate8h
    coverage
    cumulativeFundingStart
    cumulativeFundingEnd
    fundingWindowSec
    fundingIntervalSec
    paramsChangedInBucket
    indexPriceEnd
    openInterestEnd
    updateCount
  }
}
    `) as unknown as TypedDocumentString<FundingRateCandlesQuery, FundingRateCandlesQueryVariables>;
export const PerpFeesDocument = new TypedDocumentString(`
    query PerpFees($where: PerpFeeRecord_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpFeeRecord(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    account
    pool
    amount
    isRebate
    kind
    insurancePortion
    tier
    fillNotional
    builder
    timestamp
    txHash
  }
}
    `) as unknown as TypedDocumentString<PerpFeesQuery, PerpFeesQueryVariables>;
export const OpenInterestHistoryDocument = new TypedDocumentString(`
    query OpenInterestHistory($pool: String!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  OpenInterestSnapshot(
    where: {pool: {_eq: $pool}}
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    pool
    openInterest
    timestamp
    blockNumber
  }
}
    `) as unknown as TypedDocumentString<OpenInterestHistoryQuery, OpenInterestHistoryQueryVariables>;
export const PerpOrderRejectionsDocument = new TypedDocumentString(`
    query PerpOrderRejections($where: PerpOrderRejection_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpOrderRejection(
    where: $where
    order_by: [{blockNumber: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    owner
    pool
    reason
    requestIndex
    timestamp
    blockNumber
    txHash
  }
}
    `) as unknown as TypedDocumentString<PerpOrderRejectionsQuery, PerpOrderRejectionsQueryVariables>;
export const PerpPositionChangesDocument = new TypedDocumentString(`
    query PerpPositionChanges($where: PerpPositionChange_bool_exp!, $orderBy: [PerpPositionChange_order_by!], $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpPositionChange(
    where: $where
    order_by: $orderBy
    limit: $limit
    offset: $offset
  ) {
    id
    pool
    account
    kind
    sizeBefore
    sizeAfter
    closedSize
    entryPriceBefore
    entryPriceAfter
    exitPrice
    orderId
    realizedPnl
    timestamp
    blockNumber
    logIndex
    txHash
  }
}
    `) as unknown as TypedDocumentString<PerpPositionChangesQuery, PerpPositionChangesQueryVariables>;
export const PerpWalletLinkEventsDocument = new TypedDocumentString(`
    query PerpWalletLinkEvents($where: PerpWalletLinkEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpWalletLinkEvent(
    where: $where
    order_by: [{blockNumber: desc}, {logIndex: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    kind
    main
    child
    timestamp
    blockNumber
    logIndex
    txHash
  }
}
    `) as unknown as TypedDocumentString<PerpWalletLinkEventsQuery, PerpWalletLinkEventsQueryVariables>;
export const PerpMarginPullsDocument = new TypedDocumentString(`
    query PerpMarginPulls($where: PerpMarginPull_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpMarginPull(
    where: $where
    order_by: [{blockNumber: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    account
    pool
    orderId
    source
    amount
    payer
    timestamp
    blockNumber
    txHash
  }
}
    `) as unknown as TypedDocumentString<PerpMarginPullsQuery, PerpMarginPullsQueryVariables>;
export const PerpMainFundingEventsDocument = new TypedDocumentString(`
    query PerpMainFundingEvents($where: PerpMainFundingEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpMainFundingEvent(
    where: $where
    order_by: [{blockNumber: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    account
    kind
    payer
    amount
    previousPrincipal
    outstandingPrincipal
    timestamp
    blockNumber
    txHash
  }
}
    `) as unknown as TypedDocumentString<PerpMainFundingEventsQuery, PerpMainFundingEventsQueryVariables>;
export const PerpPortfolioDocument = new TypedDocumentString(`
    query PerpPortfolio($fillWhere: Fill_bool_exp!, $orderWhere: Order_bool_exp!, $ordersLimit: Int, $tradesLimit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpOrder: Order(
    where: $orderWhere
    order_by: {placedAtTimestamp: desc}
    limit: $ordersLimit
  ) {
    id
    orderId
    isBid
    price
    quantityRemaining
    filledQuantity
    fullQuantity
    placedAtTimestamp
    placedTxHash
    market {
      ...PerpPortfolioMarketFields
    }
  }
  PerpFill: Fill(
    where: $fillWhere
    order_by: {timestamp: desc}
    limit: $tradesLimit
  ) {
    id
    fillPrice
    quantity
    quoteQuantity
    timestamp
    txHash
    maker
    taker
    takerIsBid
    market {
      ...PerpPortfolioMarketFields
    }
  }
}
    fragment PerpPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  tickSize
  lotSize
  minQuantity
  lastPrice
  marginBank
  initialMarginBps
  fundingRate
  indexPrice
  stopRegistry
}`) as unknown as TypedDocumentString<PerpPortfolioQuery, PerpPortfolioQueryVariables>;
export const PerpOrderHistoryDocument = new TypedDocumentString(`
    query PerpOrderHistory($where: Order_bool_exp!, $orderBy: [Order_order_by!], $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Order(where: $where, order_by: $orderBy, limit: $limit, offset: $offset) {
    id
    orderId
    isBid
    price
    quantityRemaining
    filledQuantity
    fullQuantity
    status
    rested
    cancelReason
    expireTimestampNs
    placedAtTimestamp
    placedTxHash
    lastUpdatedAtTimestamp
    market {
      ...PerpPortfolioMarketFields
    }
  }
}
    fragment PerpPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseDecimals
  quoteDecimals
  tickSize
  lotSize
  minQuantity
  lastPrice
  marginBank
  initialMarginBps
  fundingRate
  indexPrice
  stopRegistry
}`) as unknown as TypedDocumentString<PerpOrderHistoryQuery, PerpOrderHistoryQueryVariables>;
export const PerpPositionsDocument = new TypedDocumentString(`
    query PerpPositions($where: PerpPosition_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpPosition(
    where: $where
    order_by: {updatedAt: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    pool
    account
    size
    isLong
    entryPriceX18
    realizedPnl
    updatedAt
    updatedAtBlock
  }
}
    `) as unknown as TypedDocumentString<PerpPositionsQuery, PerpPositionsQueryVariables>;
export const PerpStopOrdersDocument = new TypedDocumentString(`
    query PerpStopOrders($where: StopOrder_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  StopOrder(
    where: $where
    order_by: [{createdAt: desc}, {id: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    registry
    orderIdRaw
    owner
    isBid
    quantity
    triggerPrice
    triggerOperator
    orderType
    builder
    builderFeeBpsTimes1k
    status
    placedOrderId
    dropReason
    siblingOrderId
    intent
    cancelReason
    createdAt
    updatedAt
    txHash
    market {
      poolAddress
      baseSymbol
      quoteSymbol
      baseDecimals
      quoteDecimals
    }
  }
}
    `) as unknown as TypedDocumentString<PerpStopOrdersQuery, PerpStopOrdersQueryVariables>;
export const PerpInsuranceFundEventsDocument = new TypedDocumentString(`
    query PerpInsuranceFundEvents($where: PerpInsuranceFundEvent_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PerpInsuranceFundEvent(
    where: $where
    order_by: [{blockNumber: desc}, {logIndex: desc}]
    limit: $limit
    offset: $offset
  ) {
    id
    kind
    tier
    toTier
    amount
    requested
    covered
    account
    counterparty
    caller
    timestamp
    blockNumber
    logIndex
    txHash
  }
}
    `) as unknown as TypedDocumentString<PerpInsuranceFundEventsQuery, PerpInsuranceFundEventsQueryVariables>;
export const MarketsByPoolDocument = new TypedDocumentString(`
    query MarketsByPool($pool: String!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: {poolAddress: {_eq: $pool}}
    order_by: {createdAtTimestamp: desc}
    limit: $limit
  ) {
    ...MarketFields
  }
}
    fragment MarketFields on Market {
  id
  marketType
  poolAddress
  lastPrice
  lastTradeAt
  cumulativeBaseVolume
  cumulativeQuoteVolume
  tradeCount
  baseDecimals
  quoteDecimals
  createdAtTimestamp
  createdAtBlock
  baseToken
  quoteToken
  baseSymbol
  quoteSymbol
  baseIsNative
  tickSize
  lotSize
  minQuantity
  markPrice
  rawMidpoint
  markPriceUpdatedAt
  stopRegistry
  marginBank
  initialMarginBps
  fundingRate
  cumulativeFundingPerUnit
  indexPrice
  fundingUpdatedAt
  fundingWindowSec
  fundingIntervalSec
  openInterest
  openInterestUpdatedAt
  marketId
  marketAddress
  yesTokenId
  noTokenId
  collateral
  asset
  question
  oracleQuestion
  oracleQuestionId
  status: clobStatus
  strike
  tradingStart
  expiry
  winningOutcome
  payoutNumerators
  payoutDenominator
  settledPayoutNumerators
  voidVectorSource
  resolvedAtBlock
  resolvedAtTimestamp
  createdByTx
  creator
  voided
  backing
  nonce
  finalized
  netBacking
  context
  intervalSec
  operatorId
  venueId
  voidPolicy
}`) as unknown as TypedDocumentString<MarketsByPoolQuery, MarketsByPoolQueryVariables>;
export const PoolBindingsDocument = new TypedDocumentString(`
    query PoolBindings($pool: String!, $limit: Int!, $offset: Int!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  PoolBinding(
    where: {poolAddress: {_eq: $pool}}
    order_by: {nonce: desc}
    limit: $limit
    offset: $offset
  ) {
    id
    poolAddress
    marketId
    nonce
    fromBlock
    fromLogIndex
    fromTimestamp
    toBlock
    toLogIndex
    toTimestamp
    closedBy
  }
}
    `) as unknown as TypedDocumentString<PoolBindingsQuery, PoolBindingsQueryVariables>;
export const PoolByPkDocument = new TypedDocumentString(`
    query PoolByPk($id: String!) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Pool_by_pk(id: $id) {
    id
    address
    collateral
    creator
    currentMarketId
    currentNonce
    generationCount
    createdAtTimestamp
    updatedAtTimestamp
  }
}
    `) as unknown as TypedDocumentString<PoolByPkQuery, PoolByPkQueryVariables>;
export const PoolTypesDocument = new TypedDocumentString(`
    query PoolTypes($pools: [String!]!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: {poolAddress: {_in: $pools}}
    distinct_on: poolAddress
    order_by: [{poolAddress: asc}, {createdAtTimestamp: desc}]
    limit: $limit
  ) {
    poolAddress
    marketType
  }
}
    `) as unknown as TypedDocumentString<PoolTypesQuery, PoolTypesQueryVariables>;
export const PoolsByTypeDocument = new TypedDocumentString(`
    query PoolsByType($where: Market_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  Market(
    where: $where
    distinct_on: poolAddress
    order_by: {poolAddress: asc}
    limit: $limit
  ) {
    poolAddress
  }
}
    `) as unknown as TypedDocumentString<PoolsByTypeQuery, PoolsByTypeQueryVariables>;
export const RouterActionsDocument = new TypedDocumentString(`
    query RouterActions($where: RouterActionRecord_bool_exp!, $limit: Int, $offset: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  RouterActionRecord(
    where: $where
    order_by: {timestamp: desc}
    limit: $limit
    offset: $offset
  ) {
    ...RouterActionFields
  }
}
    fragment RouterActionFields on RouterActionRecord {
  id
  kind
  account
  market: market_id
  amount
  payout
  routedVia
  timestamp
  txHash
}`) as unknown as TypedDocumentString<RouterActionsQuery, RouterActionsQueryVariables>;
export const SpotPortfolioDocument = new TypedDocumentString(`
    query SpotPortfolio($acct: String!, $fillWhere: Fill_bool_exp!, $orderWhere: Order_bool_exp!, $ordersLimit: Int, $tradesLimit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  SpotOrder: Order(
    where: $orderWhere
    order_by: {placedAtTimestamp: desc}
    limit: $ordersLimit
  ) {
    id
    orderId
    isBid
    price
    quantityRemaining
    filledQuantity
    fullQuantity
    placedAtTimestamp
    placedTxHash
    market {
      ...SpotPortfolioMarketFields
    }
  }
  SpotStopOrder: StopOrder(
    where: {owner: {_eq: $acct}, status: {_eq: "PENDING"}}
    order_by: {createdAt: desc}
    limit: $ordersLimit
  ) {
    ...SpotStopOrderFields
    market {
      ...SpotPortfolioMarketFields
    }
  }
  SpotFill: Fill(
    where: $fillWhere
    order_by: {timestamp: desc}
    limit: $tradesLimit
  ) {
    id
    fillPrice
    quantity
    quoteQuantity
    timestamp
    txHash
    maker
    taker
    takerIsBid
    market {
      ...SpotPortfolioMarketFields
    }
  }
}
    fragment SpotPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseToken
  quoteToken
  baseDecimals
  quoteDecimals
  baseIsNative
  tickSize
  lotSize
  minQuantity
  lastPrice
  markPrice
  stopRegistry
}
fragment SpotStopOrderFields on StopOrder {
  id
  registry
  orderId: orderIdRaw
  isBid
  quantity
  triggerPrice
  triggerOperator
  orderType
  status
  placedOrderId
  createdAt
}`) as unknown as TypedDocumentString<SpotPortfolioQuery, SpotPortfolioQueryVariables>;
export const SpotStopOrdersDocument = new TypedDocumentString(`
    query SpotStopOrders($where: StopOrder_bool_exp!, $limit: Int) {
  _sdkWatermark: chain_metadata {
    chain_id
    latest_processed_block
  }
  StopOrder(where: $where, order_by: {createdAt: desc}, limit: $limit) {
    ...SpotStopOrderFields
    market {
      ...SpotPortfolioMarketFields
    }
  }
}
    fragment SpotPortfolioMarketFields on Market {
  poolAddress
  baseSymbol
  quoteSymbol
  baseToken
  quoteToken
  baseDecimals
  quoteDecimals
  baseIsNative
  tickSize
  lotSize
  minQuantity
  lastPrice
  markPrice
  stopRegistry
}
fragment SpotStopOrderFields on StopOrder {
  id
  registry
  orderId: orderIdRaw
  isBid
  quantity
  triggerPrice
  triggerOperator
  orderType
  status
  placedOrderId
  createdAt
}`) as unknown as TypedDocumentString<SpotStopOrdersQuery, SpotStopOrdersQueryVariables>;
export const SyncStatusDocument = new TypedDocumentString(`
    query SyncStatus($chainId: Int!) {
  chain_metadata(where: {chain_id: {_eq: $chainId}}) {
    chain_id
    latest_processed_block
    block_height
    num_events_processed
  }
}
    `) as unknown as TypedDocumentString<SyncStatusQuery, SyncStatusQueryVariables>;
export const IndexedChainsDocument = new TypedDocumentString(`
    query IndexedChains {
  chain_metadata {
    chain_id
  }
}
    `) as unknown as TypedDocumentString<IndexedChainsQuery, IndexedChainsQueryVariables>;