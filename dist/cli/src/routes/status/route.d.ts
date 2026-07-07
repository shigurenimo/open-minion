export declare const help = "Usage: minion status\n\n\u30A2\u30D7\u30EA\u3068gateway\u306E\u8D77\u52D5\u72B6\u6CC1\u3092\u8868\u793A\u3059\u308B\u3002";
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
}, Promise<Response & import("hono").TypedResponse<string, import("hono/utils/http-status").ContentfulStatusCode, "text">>>];
export default _default;
