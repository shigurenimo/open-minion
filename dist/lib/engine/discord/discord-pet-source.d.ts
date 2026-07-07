import { PetSource } from "../gateway/pet-source.ts";
import type { SessionInfo } from "../gateway/sessions.ts";
import type { DiscordGatewayClient } from "./discord-gateway-client.ts";
/** The id namespace for Discord pets: `discord:<userId>` — keeps them from ever colliding with Claude Code session ids. */
export declare const DISCORD_PET_ID_PREFIX = "discord:";
/**
 * Adapts a `DiscordGatewayClient`'s presence cache to the `PetSource`
 * contract: online friends read as running pets, offline friends are omitted
 * entirely, and a "Playing" activity marks the pet as gaming.
 */
export declare class DiscordPetSource extends PetSource {
    private readonly client;
    constructor(props: {
        client: DiscordGatewayClient;
    });
    read(): Map<string, SessionInfo>;
    start(): void;
    stop(): void;
}
