import { NextResponse } from 'next/server';

const FIREBASE_FUNCTIONS_BASE = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_BASE ||
    'https://us-central1-audit-3a7ec.cloudfunctions.net';

export async function GET(req: Request) {
    try {
        // Discovery endpoint
        const response = await fetch(`${FIREBASE_FUNCTIONS_BASE}/polymarketReadMcp`, {
            method: 'GET',
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in polymarketReadMcp discovery:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to discover tools' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const response = await fetch(`${FIREBASE_FUNCTIONS_BASE}/polymarketReadMcp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in polymarketReadMcp tool call:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to call MCP tool' },
            { status: 500 }
        );
    }
}
