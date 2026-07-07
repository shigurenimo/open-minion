import { z } from "zod"

/**
 * Zod schemas for the slice of the Discord Gateway protocol this library
 * consumes (https://discord.com/developers/docs/events/gateway). Frames are
 * produced by Discord, not by us, so everything degrades gracefully: required
 * fields identify the event at all, the rest `.catch()` to a safe default.
 * A frame that doesn't parse is silently dropped, same as a mid-write session
 * file in sessions.ts.
 */

export const GATEWAY_OPS = {
  dispatch: 0,
  heartbeat: 1,
  identify: 2,
  resume: 6,
  reconnect: 7,
  invalidSession: 9,
  hello: 10,
  heartbeatAck: 11,
} as const

// GUILDS (1<<0) + GUILD_MEMBERS (1<<1) + GUILD_PRESENCES (1<<8)
export const REQUIRED_INTENTS = (1 << 0) | (1 << 1) | (1 << 8)

/** The outer frame: `op` routes it, `s` advances the resume cursor, `t`+`d` carry dispatch events. */
export const gatewayFrameSchema = z.looseObject({
  op: z.number(),
  s: z.number().nullable().catch(null),
  t: z.string().nullable().catch(null),
  d: z.unknown(),
})

export type GatewayFrame = z.infer<typeof gatewayFrameSchema>

export const helloDataSchema = z.looseObject({
  heartbeat_interval: z.number(),
})

export const readyDataSchema = z.looseObject({
  session_id: z.string(),
  resume_gateway_url: z.string().optional().catch(undefined),
})

const userSchema = z.looseObject({
  id: z.string(),
  username: z.string().catch(""),
  global_name: z.string().nullable().optional().catch(undefined),
  bot: z.boolean().optional().catch(undefined),
})

const activitySchema = z.looseObject({
  type: z.number().catch(-1),
  name: z.string().catch(""),
})

const presenceSchema = z.looseObject({
  user: z.looseObject({ id: z.string() }),
  status: z.string().catch("offline"),
  activities: z.array(activitySchema).catch([]),
})

const memberSchema = z.looseObject({
  user: userSchema,
  nick: z.string().nullable().optional().catch(undefined),
})

export const guildCreateDataSchema = z.looseObject({
  id: z.string(),
  members: z.array(memberSchema).catch([]),
  presences: z.array(presenceSchema).catch([]),
})

export const presenceUpdateDataSchema = presenceSchema.extend({
  guild_id: z.string().optional().catch(undefined),
})

export const guildMemberAddDataSchema = memberSchema.extend({
  guild_id: z.string().optional().catch(undefined),
})

export const guildMemberRemoveDataSchema = z.looseObject({
  guild_id: z.string().optional().catch(undefined),
  user: z.looseObject({ id: z.string() }),
})

export type DiscordUser = z.infer<typeof userSchema>
export type DiscordMember = z.infer<typeof memberSchema>
export type DiscordPresenceData = z.infer<typeof presenceSchema>
export type DiscordGuildCreateData = z.infer<typeof guildCreateDataSchema>
export type DiscordPresenceUpdateData = z.infer<typeof presenceUpdateDataSchema>
export type DiscordGuildMemberAddData = z.infer<typeof guildMemberAddDataSchema>
export type DiscordGuildMemberRemoveData = z.infer<typeof guildMemberRemoveDataSchema>
