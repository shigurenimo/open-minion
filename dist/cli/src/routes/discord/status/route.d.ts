export declare const help = "Usage: minion discord status\n\nDiscord \u9023\u643A\u306E\u8A2D\u5B9A\u72B6\u6CC1\u3068\u3001gateway \u304C\u898B\u3066\u3044\u308B\u30D5\u30EC\u30F3\u30C9\u306E\u72B6\u614B\u3092\u8868\u793A\u3059\u308B\u3002\n\n\u30BB\u30C3\u30C8\u30A2\u30C3\u30D7\u624B\u9806:\n  1. https://discord.com/developers/applications \u3067 Bot \u3092\u4F5C\u6210\n  2. Bot \u30DA\u30FC\u30B8\u3067 PRESENCE INTENT \u3068 SERVER MEMBERS INTENT \u3092\u6709\u52B9\u5316\n  3. \u81EA\u5206\u3068\u30D5\u30EC\u30F3\u30C9\u304C\u53C2\u52A0\u3059\u308B\u79C1\u8A2D\u30B5\u30FC\u30D0\u30FC\u306B Bot \u3092\u62DB\u5F85\n  4. minion config set discord.token <Bot\u30C8\u30FC\u30AF\u30F3>\n     minion config set discord.guildId <\u30B5\u30FC\u30D0\u30FCID>\n     minion config set discord.userIds <userId,userId,...>   (\u4EFB\u610F\u30FB\u7D5E\u308A\u8FBC\u307F)\n  5. minion serve (\u307E\u305F\u306F minion start) \u3067 gateway \u3092\u518D\u8D77\u52D5\n\n\u8A2D\u5B9A\u3092\u6B8B\u3057\u305F\u307E\u307E\u4E00\u6642\u505C\u6B62\u3059\u308B\u306B\u306F: minion config set discord.enabled false";
declare const _default: [import("hono/types").H<any, string, {}, Response>, import("hono/types").H<import("hono").Env, string, {
    in: {
        json: Record<string, never>;
    };
    out: {
        json: Record<string, never>;
    };
}, import("hono").TypedResponse<string, 400, "text">>, import("hono/types").H<import("../../../factory.ts").Env, string, {
    in: {
        json: Record<string, never>;
    };
    out: {
        json: Record<string, never>;
    };
}, Promise<Response & import("hono").TypedResponse<string, import("hono/utils/http-status").ContentfulStatusCode, "text">>>];
export default _default;
