import type { DiscordGuildCreateData, DiscordGuildMemberAddData, DiscordGuildMemberRemoveData, DiscordPresenceUpdateData } from "./gateway-payloads.ts";
export type DiscordPresence = {
    /** online / idle / dnd — anything but offline. */
    online: boolean;
    /** Has a "Playing" activity right now. */
    gaming: boolean;
    /** Display name: nick > global_name > username. */
    name: string;
};
/**
 * Pure event-application layer: the gateway client feeds GUILD_CREATE /
 * PRESENCE_UPDATE / GUILD_MEMBER_* dispatches in, and the cache maintains a
 * `Map<userId, DiscordPresence>` of the watched guild's members. No IO, no
 * clock — fully unit-testable.
 *
 * Membership comes from GUILD_CREATE's `members` (bots excluded); presence
 * events for users outside that set are ignored. When `allowedUserIds` is
 * set, only those users are tracked at all.
 */
export declare class DiscordPresenceCache {
    private readonly guildId;
    private readonly allowedUserIds;
    private readonly presences;
    constructor(props: {
        guildId: string;
        allowedUserIds?: string[];
    });
    read(): Map<string, DiscordPresence>;
    /** Rebuilds membership from the watched guild's initial payload. Members absent from `presences` start offline. */
    applyGuildCreate(data: DiscordGuildCreateData): void;
    applyPresenceUpdate(data: DiscordPresenceUpdateData): void;
    applyGuildMemberAdd(data: DiscordGuildMemberAddData): void;
    applyGuildMemberRemove(data: DiscordGuildMemberRemoveData): void;
    private allows;
}
