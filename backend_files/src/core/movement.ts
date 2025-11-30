import { PriceHistory } from "./types";

export interface MovementSummary {
    tokenId: string;
    absChange: number;
    percentChange: number;
    startPrice: number;
    endPrice: number;
}

export interface MovementComparison {
    dominant: "left" | "right" | "tie";
    rationale: string;
}

export function summarizeMovement(history: PriceHistory): MovementSummary {
    if (history.history.length === 0) {
        return {
            tokenId: history.tokenId,
            absChange: 0,
            percentChange: 0,
            startPrice: 0,
            endPrice: 0,
        };
    }

    const startPrice = history.history[0].price;
    const endPrice = history.history[history.history.length - 1].price;
    const absChange = Math.abs(endPrice - startPrice);
    const percentChange = startPrice === 0 ? 0 : (endPrice - startPrice) / startPrice;

    return {
        tokenId: history.tokenId,
        absChange,
        percentChange,
        startPrice,
        endPrice,
    };
}

export function compareMovement(left: MovementSummary, right: MovementSummary): MovementComparison {
    if (left.absChange > right.absChange) {
        return {
            dominant: "left",
            rationale: `Left selection moved more (${left.absChange.toFixed(4)} vs ${right.absChange.toFixed(4)})`,
        };
    } else if (right.absChange > left.absChange) {
        return {
            dominant: "right",
            rationale: `Right selection moved more (${right.absChange.toFixed(4)} vs ${left.absChange.toFixed(4)})`,
        };
    } else {
        return {
            dominant: "tie",
            rationale: `Both selections moved the same amount (${left.absChange.toFixed(4)})`,
        };
    }
}
