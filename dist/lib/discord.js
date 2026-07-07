// Discord — friend presence as a `PetSource` (bot in a shared guild,
// GUILD_PRESENCES intent). Self-contained: the raw Gateway WS client, the
// pure presence cache, and the WebSocket boundary it rides on.
export * from "./engine/discord/gateway-payloads.js";
export * from "./engine/discord/presence-cache.js";
export * from "./engine/discord/discord-gateway-client.js";
export * from "./engine/discord/discord-pet-source.js";
export * from "./engine/discord/websocket-factory.js";
export * from "./engine/discord/node-websocket-factory.js";
export * from "./engine/discord/memory-websocket-factory.js";
