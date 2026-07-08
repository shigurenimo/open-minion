// Gateway — the renderer-facing core: pet feeds (`PetSource`), the pure pet
// state machine (`PetBehaviorEngine`), the `/sessions` + `/ws` Hono routes,
// and the HTTP/WS server (`MinionGatewayServer`).
//
// Renderers (swift/, electron/, or your own) speak the `PetSnapshotEntry`
// protocol over WS; sources implement `PetSource` — both live here.
export * from "@/lib/engine/gateway/sessions.ts"
export * from "@/lib/engine/gateway/pet-source.ts"
export * from "@/lib/engine/gateway/pet-behavior.ts"
export * from "@/lib/engine/gateway/gateway-routes.ts"
export * from "@/lib/engine/gateway/gateway-server.ts"
export * from "@/lib/engine/gateway/gateway-probe.ts"
export * from "@/lib/engine/gateway/resolve-daemon-script.ts"
