export declare const help = "Usage: minion config set <key> <value>\n\n\u8A2D\u5B9A\u5024\u3092\u66F8\u304D\u8FBC\u3080 (~/.config/minion/config.json)\u3002\n\n\u4E3B\u306A\u30AD\u30FC:\n  claude.enabled    false \u3067 Claude Code \u30BB\u30C3\u30B7\u30E7\u30F3\u306E\u30DA\u30C3\u30C8\u3092\u6B62\u3081\u308B (\u30C7\u30D5\u30A9\u30EB\u30C8\u6709\u52B9)\n  discord.enabled   false \u3067 Discord \u9023\u643A\u3092\u6B62\u3081\u308B (\u8A2D\u5B9A\u306F\u6B8B\u308B)\n  discord.token     Discord Bot \u30C8\u30FC\u30AF\u30F3 (guildId \u3068\u4E21\u65B9\u3042\u308B\u3068\u81EA\u52D5\u3067\u6709\u52B9\u5316)\n  discord.guildId   \u76E3\u8996\u3059\u308B\u79C1\u8A2D\u30B5\u30FC\u30D0\u30FC\u306E ID\n  discord.userIds   \u8868\u793A\u3059\u308B\u30E1\u30F3\u30D0\u30FC\u306E userId (\u30AB\u30F3\u30DE\u533A\u5207\u308A\u3002\u672A\u8A2D\u5B9A = \u5168\u54E1)";
declare const _default: [import("hono/types").H<any, string, {}, Response>, import("hono/types").H<import("hono").Env, string, {
    in: {
        json: Record<string, never>;
    };
    out: {
        json: Record<string, never>;
    };
}, import("hono").TypedResponse<string, 400, "text">>, import("hono/types").H<import("../../../../../factory.ts").Env, string, {
    in: {
        json: Record<string, never>;
    };
    out: {
        json: Record<string, never>;
    };
}, Promise<(Response & import("hono").TypedResponse<string, 500, "text">) | (Response & import("hono").TypedResponse<`${string} = ${string}`, import("hono/utils/http-status").ContentfulStatusCode, "text">)>>];
export default _default;
