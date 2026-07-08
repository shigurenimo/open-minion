// Discord — friend presence as a `PetSource` (bot in a shared guild,
// GUILD_PRESENCES intent). Self-contained: the raw Gateway WS client, the
// pure presence cache, and the WebSocket boundary it rides on.
export * from "@/lib/engine/discord/gateway-payloads.ts"
export * from "@/lib/engine/discord/presence-cache.ts"
export * from "@/lib/engine/discord/discord-gateway-client.ts"
export * from "@/lib/engine/discord/discord-pet-source.ts"
export * from "@/lib/engine/discord/websocket-factory.ts"
export * from "@/lib/engine/discord/node-websocket-factory.ts"
export * from "@/lib/engine/discord/memory-websocket-factory.ts"
