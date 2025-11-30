import { McpServer } from "./server";
import { TrackingService } from "../app/tracking/TrackingService";
import { AuthService } from "../app/auth/authService";

export interface CreateTrackingServerDeps {
    authService: AuthService;
    trackingService: TrackingService;
}

export function createTrackingMcpServer(deps: CreateTrackingServerDeps): McpServer {
    const { authService, trackingService } = deps;

    return {
        tools: {
            "create_tracker": {
                description: "Create a new tracker.",
                inputSchema: {
                    type: "object",
                    properties: {
                        target: { type: "object" },
                        mode: { type: "string" },
                        analysis: { type: "object" }
                    },
                    required: ["target", "mode", "analysis"]
                },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);

                    // Validate args (Basic check, real Zod schema recommended)
                    if (!args.target || !args.mode || !args.analysis) {
                        throw new Error("Missing required fields: target, mode, analysis");
                    }

                    const tracker = await trackingService.createTracker(
                        claims.userId,
                        args.target,
                        args.mode,
                        args.analysis
                    );
                    return { trackerId: tracker.id, status: "created" };
                }
            },

            "list_trackers": {
                description: "List all trackers for the user.",
                inputSchema: { type: "object", properties: {} },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    const trackers = await trackingService.listTrackers(claims.userId);
                    return { trackers };
                }
            },

            "run_tracker_now": {
                description: "Run a tracker immediately.",
                inputSchema: {
                    type: "object",
                    properties: {
                        trackerId: { type: "string" }
                    },
                    required: ["trackerId"]
                },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    if (!args.trackerId) throw new Error("Missing trackerId");

                    // Check ownership
                    const tracker = await trackingService.getTracker(args.trackerId);
                    if (!tracker) throw new Error("Tracker not found");
                    if (tracker.ownerId !== claims.userId) throw new Error("Access denied");

                    const run = await trackingService.runTrackerOnce(args.trackerId);
                    return { runId: run.id, status: run.status, changes: run.changeEvents.length };
                }
            },

            "get_tracker_status": {
                description: "Get the status of a tracker.",
                inputSchema: {
                    type: "object",
                    properties: {
                        trackerId: { type: "string" }
                    },
                    required: ["trackerId"]
                },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    if (!args.trackerId) throw new Error("Missing trackerId");

                    const tracker = await trackingService.getTracker(args.trackerId);
                    if (!tracker) throw new Error("Tracker not found");
                    if (tracker.ownerId !== claims.userId) throw new Error("Access denied");

                    return { status: tracker.status, lastRun: tracker.updatedAt };
                }
            },

            "update_tracker_mode": {
                description: "Update the mode of a tracker.",
                inputSchema: {
                    type: "object",
                    properties: {
                        trackerId: { type: "string" },
                        mode: { type: "string" }
                    },
                    required: ["trackerId", "mode"]
                },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    if (!args.trackerId || !args.mode) throw new Error("Missing trackerId or mode");

                    const tracker = await trackingService.getTracker(args.trackerId);
                    if (!tracker) throw new Error("Tracker not found");
                    if (tracker.ownerId !== claims.userId) throw new Error("Access denied");

                    // Update logic (TODO: Add updateTrackerMode to service)
                    tracker.mode = args.mode;
                    await trackingService.updateTracker(tracker);
                    return { status: "updated", mode: args.mode };
                }
            },

            "subscribe_shared_tracker": {
                description: "Subscribe to a shared tracker.",
                inputSchema: {
                    type: "object",
                    properties: {
                        trackerId: { type: "string" }
                    },
                    required: ["trackerId"]
                },
                handler: async (args: any) => {
                    const { claims } = authService.authenticate(args.token);
                    if (!args.trackerId) throw new Error("Missing trackerId");

                    // Logic to subscribe (TODO: Add subscribe method to service)
                    // For now, just add a viewer subscription
                    await trackingService.subscribe(args.trackerId, claims.userId, 'viewer');
                    return { status: "subscribed" };
                }
            }
        }
    };
}
