import { auth } from '@/lib/firebase';

// Use the proxy path defined in next.config.ts
const MCP_BASE_URL = '/api/mcp';
const AUTH_TOKEN_TTL_SECONDS = 3600; // 1 hour default
const REFRESH_BUFFER_SECONDS = 300; // Refresh 5 minutes before expiry

interface McpTokenResponse {
    token: string;
    claims: {
        userId: string;
        role: string;
        tier: string;
        scopes: string[];
        issuedAt: number;
        expiresAt: number;
    };
}

let cachedToken: string | null = null;
let tokenExpiration: number | null = null;
let tokenPromise: Promise<string> | null = null;

export async function getMcpToken(): Promise<string> {
    // Return cached token if valid
    if (cachedToken && tokenExpiration && Date.now() / 1000 < tokenExpiration - REFRESH_BUFFER_SECONDS) {
        return cachedToken;
    }

    // If a request is already in progress, return that promise
    if (tokenPromise) {
        return tokenPromise;
    }

    tokenPromise = (async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Get fresh Firebase ID token
            const idToken = await user.getIdToken(true);

            const response = await fetch(`${MCP_BASE_URL}/issueMcpToken`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idToken,
                    scopes: [
                        'polymarket:read:public',
                        'polymarket:read:user',
                        'polymarket:read:stream',
                        'markets:read',
                        'analysis:read'
                    ],
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to issue MCP token: ${response.status} ${errorText}`);
            }

            const data: McpTokenResponse = await response.json();

            cachedToken = data.token;
            tokenExpiration = data.claims.expiresAt;

            return data.token;
        } catch (error) {
            console.error('Error getting MCP token:', error);
            throw error;
        } finally {
            tokenPromise = null;
        }
    })();

    return tokenPromise;
}

export function clearMcpToken() {
    cachedToken = null;
    tokenExpiration = null;
    tokenPromise = null;
}
