export type ChangeType = "added" | "updated" | "removed";

export interface RawItem {
  sourceId: string;
  externalId: string;
  receivedAt: Date;
  payload: unknown;
}

export interface NormalizedItem {
  sourceId: string;
  externalId: string;
  normalizedAt: Date;
  fingerprint: string;
  data: Record<string, unknown>;
}

export interface ChangeEvent {
  sourceId: string;
  externalId: string;
  type: ChangeType;
  detectedAt: Date;
  previous?: NormalizedItem;
  current?: NormalizedItem;
}

export interface MarketOutcome {
  name: string;
  price: number;
  tokenId?: string;
}

export interface MarketQuote {
  id: string;
  question: string;
  slug?: string;
  description?: string;
  active?: boolean;
  closed?: boolean;
  endDate?: Date;
  volume?: number;
  volume24hr?: number;
  liquidity?: number;
  outcomes: MarketOutcome[];
  lastTradePrice?: number;
  oneDayPriceChange?: number;
  category?: string;
  image?: string;
  icon?: string;
}

export interface PricePoint {
  timestamp: Date;
  price: number;
}

export interface PriceHistory {
  tokenId: string;
  history: PricePoint[];
}
