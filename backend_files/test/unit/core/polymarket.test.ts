import { describe, it } from "node:test";
import assert from "node:assert";
import { MarketSchema, SearchMarketsInput } from "../../../src/core/polymarket/types";

describe("Polymarket Core Types", () => {
    it("should validate MarketSchema", () => {
        const validMarket = {
            id: "123",
            question: "Will Bitcoin hit 100k?",
            conditionId: "0x...",
            slug: "bitcoin-100k",
            active: true,
            closed: false,
            archived: false,
        };
        const result = MarketSchema.safeParse(validMarket);
        assert.ok(result.success);
    });

    it("should validate SearchMarketsInput", () => {
        const validInput = { query: "Bitcoin", limit: 10 };
        const result = SearchMarketsInput.safeParse(validInput);
        assert.ok(result.success);
    });
});
