export declare const help = "Usage: minion start\n\n\u30A2\u30D7\u30EA\u3092\u30EA\u30EA\u30FC\u30B9\u30D3\u30EB\u30C9\u3067\u8D77\u52D5\u3059\u308B\u3002\u3059\u3067\u306B\u8D77\u52D5\u4E2D\u306A\u3089\u4F55\u3082\u3057\u306A\u3044\u3002";
declare const _default: [import("hono/types").H<any, string, {}, Response>, import("hono/types").H<import("hono").Env, string, {
    in: {
        json: Record<string, never>;
    };
    out: {
        json: Record<string, never>;
    };
}, import("hono").TypedResponse<string, 400, "text">>, import("hono/types").H<import("../../factory.ts").Env, string, {
    in: {
        json: Record<string, never>;
    };
    out: {
        json: Record<string, never>;
    };
}, Promise<Response & import("hono").TypedResponse<string, 200 | 500, "text">>>];
export default _default;
