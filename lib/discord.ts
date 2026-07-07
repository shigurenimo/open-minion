// Discord — friend presence as a `PetSource` (bot in a shared guild,
// GUILD_PRESENCES intent). Self-contained: the raw Gateway WS client, the
// pure presence cache, and the WebSocket boundary it rides on.
export * from "./engine/discord/gateway-payloads"
export * from "./engine/discord/presence-cache"
export * from "./engine/discord/discord-gateway-client"
export * from "./engine/discord/discord-pet-source"
export * from "./engine/discord/websocket-factory"
export * from "./engine/discord/node-websocket-factory"
export * from "./engine/discord/memory-websocket-factory"
