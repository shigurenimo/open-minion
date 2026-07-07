export declare const help = "Usage: minion dev\n\n\u4E00\u65E6\u505C\u6B62\u3057\u3066\u304B\u3089\u3001\u30C7\u30D0\u30C3\u30B0\u30D3\u30EB\u30C9\u3067\u8D77\u52D5\u3057\u76F4\u3059\u3002";
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
