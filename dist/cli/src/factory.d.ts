import type { Minion } from "../../lib/minion.ts";
export type Env = {
    Bindings: {
        minion: Minion;
    };
};
export declare const factory: import("hono/factory").Factory<Env, string>;
