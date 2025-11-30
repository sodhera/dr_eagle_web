import React, { useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

// --- Types based on new widget_structure.json ---

interface Resolution {
    resolved: boolean;
    resolution_time: string | null;
    winning_outcome_id: string | null;
    source: string | null;
}

interface Metrics {
    base_currency: string;
    total_volume_usd: number;
    open_interest_usd: number;
    liquidity_usd: number;
    num_traders: number | null;
}

interface Instrument {
    entity_type: string;
    id: string;
    slug: string;
    title: string;
    url: string;
    category: string;
    tags: string[];
    status: string;
    created_at: string;
    end_time: string;
    resolution: Resolution;
    metrics: Metrics;
}

interface ChartConfig {
    granularity: string;
    from: string;
    to: string;
    timezone: string;
}

interface Outcome {
    outcome_id: string;
    label: string;
    token_address: string;
    color_hint: number;
    current_price: number;
    current_probability: number;
    price_24h_ago: number;
    price_24h_change_abs: number;
    price_24h_change_pct: number;
    volume_24h_usd: number;
    is_winner: boolean;
    is_tradable: boolean;
}

interface ChartPoint {
    t: number;
    p: number;
    v: number;
}

interface Series {
    outcome_id: string;
    points: ChartPoint[];
}

export interface PolymarketData {
    schema_version: string;
    widget_type: string;
    instrument: Instrument;
    chart: ChartConfig;
    outcomes: Outcome[];
    series: Series[];
}

export interface PolymarketWidgetProps {
    data: PolymarketData;
}

// --- Constants ---

const COLOR_PALETTE = [
    '#10B981', // 0: Green
    '#EF4444', // 1: Red
    '#3B82F6', // 2: Blue
    '#F59E0B', // 3: Yellow
    '#8B5CF6', // 4: Purple
    '#EC4899', // 5: Pink
    '#6366F1', // 6: Indigo
    '#14B8A6', // 7: Teal
];

const getColor = (hint: number) => COLOR_PALETTE[hint % COLOR_PALETTE.length];

// --- Icons ---

const TrendingUpIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

const TrendingDownIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
);

const BarChartIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
);

const DollarSignIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);

const BookmarkIcon = ({ className, filled }: { className?: string, filled?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
);

// --- Helper Components ---

const PercentageChange = ({ value }: { value: number | undefined | null }) => {
    if (value === undefined || value === null) return <span className="text-gray-500">-</span>;
    const isPositive = value >= 0;
    const color = isPositive ? '#10B981' : '#EF4444'; // Green or Red
    const Icon = isPositive ? TrendingUpIcon : TrendingDownIcon;

    return (
        <span style={{ color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Icon className="w-3 h-3" />
            {Math.abs(value).toFixed(2)}%
        </span>
    );
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
};

const formatPercentage = (probability: number | undefined | null) => {
    if (probability === undefined || probability === null) return "0%";
    const percentage = probability * 100;
    if (percentage === 0) return "0%";
    if (percentage < 1) return percentage.toFixed(1) + "%";
    return percentage.toFixed(0) + "%";
};

// --- Main Component ---

export default function PolymarketWidget({ data }: PolymarketWidgetProps) {
    if (!data || !data.instrument || !data.outcomes) {
        return <div className="p-4 text-red-400">Error: Invalid widget data</div>;
    }

    const { instrument, outcomes, series } = data;
    const [isBookmarked, setIsBookmarked] = useState(false);

    // Use the outcome with the highest probability as the primary one
    const primaryOutcome = [...outcomes].sort((a, b) => (b.current_probability || 0) - (a.current_probability || 0))[0] || outcomes[0];

    // Flatten data for the chart
    const chartDataMap = new Map<number, any>();

    if (series && Array.isArray(series)) {
        series.forEach(s => {
            if (s.points) {
                s.points.forEach(point => {
                    const existing = chartDataMap.get(point.t) || { time: point.t };
                    // Find outcome label for this series
                    const outcome = outcomes.find(o => o.outcome_id === s.outcome_id);
                    if (outcome) {
                        existing[outcome.label] = point.p; // Using probability 'p' for the chart
                    }
                    chartDataMap.set(point.t, existing);
                });
            }
        });
    }

    let chartData = Array.from(chartDataMap.values()).sort((a, b) => a.time - b.time);

    // FIX: If there is only 1 data point, AreaChart won't render anything.
    // We duplicate the point to create a flat line across the view.
    if (chartData.length === 1) {
        const singlePoint = chartData[0];
        // Create a fake "start" point 24 hours before
        const startPoint = { ...singlePoint, time: singlePoint.time - (24 * 60 * 60 * 1000) };
        chartData = [startPoint, singlePoint];
    }

    const formatXAxis = (tickItem: number) => {
        const date = new Date(tickItem);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    return (
        <div className="polymarket-widget">
            {/* Header */}
            <div className="widget-header">
                <div className="market-info">
                    <div className="category-badge">{instrument.category}</div>
                    <h3 className="market-question">{instrument.title}</h3>
                </div>
                <button
                    className={`bookmark-btn ${isBookmarked ? 'active' : ''}`}
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    aria-label="Bookmark market"
                >
                    <BookmarkIcon className="bookmark-icon" filled={isBookmarked} />
                </button>
            </div>

            {/* Price Hero */}
            <div className="price-hero">
                <div className="big-price-label" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: 500 }}>
                    {primaryOutcome?.label || 'Unknown'}
                </div>
                <div className="big-price">
                    {formatPercentage(primaryOutcome?.current_probability)}
                </div>
                <div className="price-change-badge">
                    <PercentageChange value={primaryOutcome?.price_24h_change_pct} />
                    <span className="time-period">Today</span>
                </div>
            </div>

            {/* Chart */}
            <div className="chart-container">
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={chartData}>
                        <defs>
                            {outcomes.map((outcome) => (
                                <linearGradient key={`gradient-${outcome.outcome_id}`} id={`gradient-${outcome.outcome_id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={getColor(outcome.color_hint)} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={getColor(outcome.color_hint)} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="time"
                            tickFormatter={formatXAxis}
                            stroke="rgba(255,255,255,0.3)"
                            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(20, 20, 30, 0.9)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}
                            labelFormatter={(label) => new Date(label).toLocaleString()}
                            formatter={(value: number) => [value.toFixed(2), 'Prob']}
                        />
                        {outcomes.map((outcome) => (
                            <Area
                                key={outcome.outcome_id}
                                type="monotone"
                                dataKey={outcome.label}
                                stroke={getColor(outcome.color_hint)}
                                strokeWidth={2}
                                fill={`url(#gradient-${outcome.outcome_id})`}
                                fillOpacity={1}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Outcomes List */}
            <div className="outcomes-section">
                <div className="section-label">Outcomes</div>
                <div className="outcomes-list">
                    {outcomes.map(outcome => (
                        <div key={outcome.outcome_id} className="outcome-row">
                            <div className="outcome-info">
                                <div className="outcome-name">{outcome.label}</div>
                                <div className="outcome-bar-bg">
                                    <div
                                        className="outcome-bar-fill"
                                        style={{
                                            width: `${outcome.current_probability * 100}%`,
                                            backgroundColor: getColor(outcome.color_hint)
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="outcome-price" style={{ color: getColor(outcome.color_hint) }}>
                                {formatPercentage(outcome.current_probability)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stats Footer */}
            <div className="stats-footer">
                <div className="stat-item">
                    <div className="stat-label">
                        <BarChartIcon className="stat-icon" />
                        Volume
                    </div>
                    <div className="stat-value">${formatNumber(instrument.metrics?.total_volume_usd)}</div>
                </div>
                <div className="stat-divider" />
                <div className="stat-item">
                    <div className="stat-label">
                        <DollarSignIcon className="stat-icon" />
                        Liquidity
                    </div>
                    <div className="stat-value">${formatNumber(instrument.metrics?.liquidity_usd)}</div>
                </div>
            </div>

            <style jsx>{`
        .polymarket-widget {
          background: linear-gradient(145deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 30, 0.9));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 20px;
          width: 100%;
          max-width: 420px;
          color: #ffffff;
          font-family: var(--font-sans);
          box-shadow: 
            0 10px 30px -5px rgba(0, 0, 0, 0.3),
            0 4px 10px -2px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          overflow: hidden;
          position: relative;
        }

        /* Subtle glow effect */
        .polymarket-widget::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100px;
            background: radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.05), transparent 70%);
            pointer-events: none;
        }

        .widget-header {
          display: flex;
          gap: 14px;
          margin-bottom: 20px;
          align-items: flex-start;
          justify-content: space-between;
        }

        .bookmark-btn {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255, 255, 255, 0.6);
            cursor: pointer;
            transition: all 0.2s ease;
            flex-shrink: 0;
        }

        .bookmark-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #ffffff;
        }

        .bookmark-btn.active {
            background: rgba(255, 255, 255, 0.15);
            color: #ffffff;
            border-color: rgba(255, 255, 255, 0.3);
        }

        .bookmark-icon {
            width: 20px;
            height: 20px;
        }

        .market-info {
            flex: 1;
        }

        .category-badge {
            display: inline-block;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 4px;
        }

        .market-question {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          line-height: 1.3;
          color: #ffffff;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .price-hero {
          display: flex;
          flex-direction: column; /* Stack label and price */
          align-items: flex-start;
          gap: 4px;
          margin-bottom: 20px;
        }

        .big-price {
          font-size: 2.5rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .price-change-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 8px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .time-period {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .chart-container {
          margin-bottom: 24px;
          margin-left: -10px;
        }

        .outcomes-section {
            margin-bottom: 20px;
        }

        .section-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: rgba(255, 255, 255, 0.4);
            margin-bottom: 10px;
            font-weight: 600;
        }

        .outcomes-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 240px;
          overflow-y: auto;
          padding-right: 8px;
        }

        /* Custom Scrollbar for outcomes list */
        .outcomes-list::-webkit-scrollbar {
            width: 4px;
        }
        .outcomes-list::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 2px;
        }
        .outcomes-list::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
        }
        .outcomes-list::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .outcome-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .outcome-info {
            flex: 1;
        }

        .outcome-name {
            font-size: 0.9rem;
            font-weight: 500;
            margin-bottom: 6px;
            color: rgba(255, 255, 255, 0.9);
        }

        .outcome-bar-bg {
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
        }

        .outcome-bar-fill {
            height: 100%;
            border-radius: 3px;
        }

        .outcome-price {
            font-size: 1rem;
            font-weight: 700;
            min-width: 40px;
            text-align: right;
        }

        .stats-footer {
          display: flex;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-divider {
            width: 1px;
            height: 24px;
            background: rgba(255, 255, 255, 0.1);
            margin: 0 16px;
        }

        .stat-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 500;
        }

        .stat-icon {
            width: 14px;
            height: 14px;
            opacity: 0.7;
        }

        .stat-value {
          font-size: 1rem;
          font-weight: 600;
          color: #ffffff;
        }
      `}</style>
        </div>
    );
}
