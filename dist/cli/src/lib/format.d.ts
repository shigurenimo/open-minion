import type { MinionAppStatus, MinionKillResult, MinionStartResult } from "../../../lib/engine/app/app-runner.ts";
export declare function formatStartResult(result: MinionStartResult): string;
export declare function isStartError(result: MinionStartResult): boolean;
export declare function formatKillResult(result: MinionKillResult): string;
export declare function formatAppStatus(status: MinionAppStatus): string;
