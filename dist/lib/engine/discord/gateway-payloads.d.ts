import { z } from "zod";
/**
 * Zod schemas for the slice of the Discord Gateway protocol this library
 * consumes (https://discord.com/developers/docs/events/gateway). Frames are
 * produced by Discord, not by us, so everything degrades gracefully: required
 * fields identify the event at all, the rest `.catch()` to a safe default.
 * A frame that doesn't parse is silently dropped, same as a mid-write session
 * file in sessions.ts.
 */
export declare const GATEWAY_OPS: {
    readonly dispatch: 0;
    readonly heartbeat: 1;
    readonly identify: 2;
    readonly resume: 6;
    readonly reconnect: 7;
    readonly invalidSession: 9;
    readonly hello: 10;
    readonly heartbeatAck: 11;
};
export declare const REQUIRED_INTENTS: number;
/** The outer frame: `op` routes it, `s` advances the resume cursor, `t`+`d` carry dispatch events. */
export declare const gatewayFrameSchema: z.ZodObject<{
    op: z.ZodNumber;
    s: z.ZodCatch<z.ZodNullable<z.ZodNumber>>;
    t: z.ZodCatch<z.ZodNullable<z.ZodString>>;
    d: z.ZodUnknown;
}, z.core.$loose>;
export type GatewayFrame = z.infer<typeof gatewayFrameSchema>;
export declare const helloDataSchema: z.ZodObject<{
    heartbeat_interval: z.ZodNumber;
}, z.core.$loose>;
export declare const readyDataSchema: z.ZodObject<{
    session_id: z.ZodString;
    resume_gateway_url: z.ZodCatch<z.ZodOptional<z.ZodString>>;
}, z.core.$loose>;
declare const userSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodCatch<z.ZodString>;
    global_name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    bot: z.ZodCatch<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$loose>;
declare const presenceSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$loose>;
    status: z.ZodCatch<z.ZodString>;
    activities: z.ZodCatch<z.ZodArray<z.ZodObject<{
        type: z.ZodCatch<z.ZodNumber>;
        name: z.ZodCatch<z.ZodString>;
    }, z.core.$loose>>>;
}, z.core.$loose>;
declare const memberSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodCatch<z.ZodString>;
        global_name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        bot: z.ZodCatch<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$loose>;
    nick: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, z.core.$loose>;
export declare const guildCreateDataSchema: z.ZodObject<{
    id: z.ZodString;
    members: z.ZodCatch<z.ZodArray<z.ZodObject<{
        user: z.ZodObject<{
            id: z.ZodString;
            username: z.ZodCatch<z.ZodString>;
            global_name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
            bot: z.ZodCatch<z.ZodOptional<z.ZodBoolean>>;
        }, z.core.$loose>;
        nick: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    }, z.core.$loose>>>;
    presences: z.ZodCatch<z.ZodArray<z.ZodObject<{
        user: z.ZodObject<{
            id: z.ZodString;
        }, z.core.$loose>;
        status: z.ZodCatch<z.ZodString>;
        activities: z.ZodCatch<z.ZodArray<z.ZodObject<{
            type: z.ZodCatch<z.ZodNumber>;
            name: z.ZodCatch<z.ZodString>;
        }, z.core.$loose>>>;
    }, z.core.$loose>>>;
}, z.core.$loose>;
export declare const presenceUpdateDataSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$loose>;
    status: z.ZodCatch<z.ZodString>;
    activities: z.ZodCatch<z.ZodArray<z.ZodObject<{
        type: z.ZodCatch<z.ZodNumber>;
        name: z.ZodCatch<z.ZodString>;
    }, z.core.$loose>>>;
    guild_id: z.ZodCatch<z.ZodOptional<z.ZodString>>;
}, z.core.$loose>;
export declare const guildMemberAddDataSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        username: z.ZodCatch<z.ZodString>;
        global_name: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
        bot: z.ZodCatch<z.ZodOptional<z.ZodBoolean>>;
    }, z.core.$loose>;
    nick: z.ZodCatch<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    guild_id: z.ZodCatch<z.ZodOptional<z.ZodString>>;
}, z.core.$loose>;
export declare const guildMemberRemoveDataSchema: z.ZodObject<{
    guild_id: z.ZodCatch<z.ZodOptional<z.ZodString>>;
    user: z.ZodObject<{
        id: z.ZodString;
    }, z.core.$loose>;
}, z.core.$loose>;
export type DiscordUser = z.infer<typeof userSchema>;
export type DiscordMember = z.infer<typeof memberSchema>;
export type DiscordPresenceData = z.infer<typeof presenceSchema>;
export type DiscordGuildCreateData = z.infer<typeof guildCreateDataSchema>;
export type DiscordPresenceUpdateData = z.infer<typeof presenceUpdateDataSchema>;
export type DiscordGuildMemberAddData = z.infer<typeof guildMemberAddDataSchema>;
export type DiscordGuildMemberRemoveData = z.infer<typeof guildMemberRemoveDataSchema>;
export {};
