export declare const help = "Usage: minion dex\n\n\u5B9F\u7E3E\u3068\u30DF\u30CB\u30AA\u30F3\u56F3\u9451\u3092\u8868\u793A\u3059\u308B\u3002\u30BB\u30C3\u30B7\u30E7\u30F3\u6570\u30FB\u540C\u6642\u5B9F\u884C\u6570\u30FB\u6642\u9593\u5E2F\u30FB\u30C8\u30FC\u30AF\u30F3\u6D88\u8CBB\u91CF\u3092\n\u5143\u306B\u5B9F\u7E3E\u3092\u89E3\u9664\u3057\u3001\u6761\u4EF6\u3092\u6E80\u305F\u3059\u3068\u73CD\u3057\u3044\u30DF\u30CB\u30AA\u30F3\u304C\u51FA\u73FE\u3059\u308B\u3002";
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
