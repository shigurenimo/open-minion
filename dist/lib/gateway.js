// Gateway — the renderer-facing core: pet feeds (`PetSource`), the pure pet
// state machine (`PetBehaviorEngine`), the `/sessions` + `/ws` Hono routes,
// and the HTTP/WS server (`MinionGatewayServer`).
//
// Renderers (swift/, electron/, or your own) speak the `PetSnapshotEntry`
// protocol over WS; sources implement `PetSource` — both live here.
export * from "./engine/gateway/sessions.js";
export * from "./engine/gateway/pet-source.js";
export * from "./engine/gateway/pet-behavior.js";
export * from "./engine/gateway/gateway-routes.js";
export * from "./engine/gateway/gateway-server.js";
export * from "./engine/gateway/gateway-probe.js";
export * from "./engine/gateway/resolve-daemon-script.js";
