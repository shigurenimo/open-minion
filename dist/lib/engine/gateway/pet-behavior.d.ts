import type { MinionRandomSource } from "../random/random-source.ts";
import type { SessionInfo } from "./sessions.ts";
export declare const IDLE_CLIP = 0;
export declare const ACTIONS: {
    durationMs: [number, number];
    weight: number;
}[];
export declare const SLEEPING_ACTIONS: {
    clipIndex: number;
    durationMs: [number, number];
    weight: number;
}[];
export declare const GAMING_ACTIONS: {
    clipIndex: number;
    durationMs: [number, number];
    weight: number;
}[];
export type PetAction = {
    clipIndex: number;
    durationMs: number;
};
export declare function pickAction(random: MinionRandomSource): PetAction;
export declare function pickSleepingAction(random: MinionRandomSource): PetAction;
export declare function pickGamingAction(random: MinionRandomSource): PetAction;
export type PetBehavior = {
    running: boolean;
    gaming: boolean;
    name: string;
    clipIndex: number;
    actionEndsAt: number;
};
export type PetSnapshotEntry = {
    id: string;
    state: "running" | "sleeping";
    clipIndex: number;
    name: string;
    activity?: "gaming";
};
/**
 * Pure per-session state machine: given the latest active-session snapshot and
 * the current time, decides each pet's animation clip and how long it plays.
 * Holds no IO — safe to tick from a test with a fake clock and random source.
 */
export declare class PetBehaviorEngine {
    private readonly random;
    private readonly behaviors;
    constructor(props: {
        random: MinionRandomSource;
    });
    /** Advances state given `now` and the latest active sessions. Returns whether anything changed. */
    tick(now: number, activeSessions: Map<string, SessionInfo>): boolean;
    snapshot(): PetSnapshotEntry[];
    private pick;
}
