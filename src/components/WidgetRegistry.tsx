import React from 'react';
import PolymarketWidget, { PolymarketData } from './PolymarketWidget';

// Define the mapping of tool names to component renderers
type WidgetRenderer = (data: any) => React.ReactNode;

const registry: Record<string, WidgetRenderer> = {
    'render_polymarket_widget': (data: any) => {
        // Validate data structure if needed, or cast it
        return <PolymarketWidget data={data as PolymarketData} />;
    },
    // Future widgets can be added here
    // 'render_weather_widget': (data) => <WeatherWidget data={data} />,
};

export const getWidgetForTool = (toolName: string, args: string): React.ReactNode | null => {
    const renderer = registry[toolName];
    if (!renderer) return null;

    try {
        const data = JSON.parse(args);
        return renderer(data);
    } catch (e) {
        console.error(`Failed to parse arguments for tool ${toolName}:`, e);
        return null;
    }
};
