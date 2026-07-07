import { PetSource } from "../gateway/pet-source.js";
/** The id namespace for Discord pets: `discord:<userId>` — keeps them from ever colliding with Claude Code session ids. */
export const DISCORD_PET_ID_PREFIX = "discord:";
/**
 * Adapts a `DiscordGatewayClient`'s presence cache to the `PetSource`
 * contract: online friends read as running pets, offline friends are omitted
 * entirely, and a "Playing" activity marks the pet as gaming.
 */
export class DiscordPetSource extends PetSource {
    client;
    constructor(props) {
        super();
        this.client = props.client;
    }
    read() {
        const result = new Map();
        for (const [userId, presence] of this.client.presences()) {
            if (!presence.online)
                continue;
            result.set(`${DISCORD_PET_ID_PREFIX}${userId}`, {
                running: true,
                name: presence.name,
                ...(presence.gaming ? { activity: "gaming" } : {}),
            });
        }
        return result;
    }
    start() {
        this.client.start();
    }
    stop() {
        this.client.stop();
    }
}
