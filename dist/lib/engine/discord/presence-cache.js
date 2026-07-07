/** Discord activity type 0 = "Playing <game>". */
const ACTIVITY_TYPE_PLAYING = 0;
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
export class DiscordPresenceCache {
    guildId;
    allowedUserIds;
    presences = new Map();
    constructor(props) {
        this.guildId = props.guildId;
        this.allowedUserIds =
            props.allowedUserIds && props.allowedUserIds.length > 0 ? new Set(props.allowedUserIds) : null;
    }
    read() {
        return new Map(this.presences);
    }
    /** Rebuilds membership from the watched guild's initial payload. Members absent from `presences` start offline. */
    applyGuildCreate(data) {
        if (data.id !== this.guildId)
            return;
        this.presences.clear();
        for (const member of data.members) {
            if (member.user.bot)
                continue;
            if (!this.allows(member.user.id))
                continue;
            this.presences.set(member.user.id, {
                online: false,
                gaming: false,
                name: displayName(member),
            });
        }
        for (const presence of data.presences) {
            const existing = this.presences.get(presence.user.id);
            if (!existing)
                continue;
            const next = toPresenceFlags(presence);
            existing.online = next.online;
            existing.gaming = next.gaming;
        }
    }
    applyPresenceUpdate(data) {
        if (data.guild_id !== undefined && data.guild_id !== this.guildId)
            return;
        const existing = this.presences.get(data.user.id);
        if (!existing)
            return;
        const next = toPresenceFlags(data);
        existing.online = next.online;
        existing.gaming = next.gaming;
    }
    applyGuildMemberAdd(data) {
        if (data.guild_id !== undefined && data.guild_id !== this.guildId)
            return;
        if (data.user.bot)
            return;
        if (!this.allows(data.user.id))
            return;
        if (this.presences.has(data.user.id))
            return;
        this.presences.set(data.user.id, { online: false, gaming: false, name: displayName(data) });
    }
    applyGuildMemberRemove(data) {
        if (data.guild_id !== undefined && data.guild_id !== this.guildId)
            return;
        this.presences.delete(data.user.id);
    }
    allows(userId) {
        return this.allowedUserIds === null || this.allowedUserIds.has(userId);
    }
}
function displayName(member) {
    return member.nick ?? member.user.global_name ?? member.user.username;
}
function toPresenceFlags(presence) {
    const online = presence.status !== "offline" && presence.status !== "invisible";
    const gaming = online && presence.activities.some((activity) => activity.type === ACTIVITY_TYPE_PLAYING);
    return { online, gaming };
}
