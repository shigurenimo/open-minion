// Gateway — the renderer-facing core: pet feeds (`PetSource`), the pure pet
// state machine (`PetBehaviorEngine`), the `/sessions` + `/ws` Hono routes,
// and the HTTP/WS server (`MinionGatewayServer`).
//
// Renderers (swift/, electron/, or your own) speak the `PetSnapshotEntry`
// protocol over WS; sources implement `PetSource` — both live here.
export * from "./engine/gateway/sessions.ts"
export * from "./engine/gateway/pet-source.ts"
export * from "./engine/gateway/pet-behavior.ts"
export * from "./engine/gateway/gateway-routes.ts"
export * from "./engine/gateway/gateway-server.ts"
export * from "./engine/gateway/gateway-probe.ts"
export * from "./engine/gateway/resolve-daemon-script.ts"
