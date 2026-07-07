export declare const help = "Usage: minion config list\n\n\u8A2D\u5B9A\u5024\u3092\u4E00\u89A7\u8868\u793A\u3059\u308B\u3002";
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
