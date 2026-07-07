import { PetSource } from "../gateway/pet-source"
import type { SessionInfo } from "../gateway/sessions"
import type { DiscordGatewayClient } from "./discord-gateway-client"

/** The id namespace for Discord pets: `discord:<userId>` — keeps them from ever colliding with Claude Code session ids. */
export const DISCORD_PET_ID_PREFIX = "discord:"

/**
 * Adapts a `DiscordGatewayClient`'s presence cache to the `PetSource`
 * contract: online friends read as running pets, offline friends are omitted
 * entirely, and a "Playing" activity marks the pet as gaming.
 */
export class DiscordPetSource extends PetSource {
  private readonly client: DiscordGatewayClient

  constructor(props: { client: DiscordGatewayClient }) {
    super()
    this.client = props.client
  }

  read(): Map<string, SessionInfo> {
    const result = new Map<string, SessionInfo>()
    for (const [userId, presence] of this.client.presences()) {
      if (!presence.online) continue
      result.set(`${DISCORD_PET_ID_PREFIX}${userId}`, {
        running: true,
        name: presence.name,
        ...(presence.gaming ? { activity: "gaming" as const } : {}),
      })
    }
    return result
  }

  start(): void {
    this.client.start()
  }

  stop(): void {
    this.client.stop()
  }
}
