// Gateway — the renderer-facing core: pet feeds (`PetSource`), the pure pet
// state machine (`PetBehaviorEngine`), the `/sessions` + `/ws` Hono routes,
// and the `Bun.serve` wrapper (`MinionGatewayServer`).
//
// Renderers (swift/, electron/, or your own) speak the `PetSnapshotEntry`
// protocol over WS; sources implement `PetSource` — both live here.
export * from "./engine/gateway/sessions"
export * from "./engine/gateway/pet-source"
export * from "./engine/gateway/pet-behavior"
export * from "./engine/gateway/gateway-routes"
export * from "./engine/gateway/gateway-server"
export * from "./engine/gateway/gateway-probe"
export * from "./engine/gateway/resolve-daemon-script"
