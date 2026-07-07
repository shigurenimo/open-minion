export declare const help = "Usage: minion serve [--port <port>]\n\ngateway \u3092\u3053\u306E\u30D7\u30ED\u30BB\u30B9\u3067\u524D\u9762\u8D77\u52D5\u3059\u308B (Ctrl+C \u3067\u505C\u6B62)\u3002\nSwift \u30A2\u30D7\u30EA\u3092\u30D3\u30EB\u30C9\u3057\u306A\u3044\u74B0\u5883 (Windows \u306A\u3069) \u3067\u3001Electron \u7B49\u306E\n\u5916\u90E8\u30AF\u30E9\u30A4\u30A2\u30F3\u30C8\u306B ws://127.0.0.1:4756/ws \u3092\u63D0\u4F9B\u3059\u308B\u305F\u3081\u306B\u4F7F\u3046\u3002";
declare const _default: [import("hono/types").H<any, string, {}, Response>, import("hono/types").H<import("hono").Env, string, {
    in: {
        json: {
            port?: string | undefined;
        };
    };
    out: {
        json: {
            port?: string | undefined;
        };
    };
}, import("hono").TypedResponse<string, 400, "text">>, import("hono/types").H<import("../../factory.ts").Env, string, {
    in: {
        json: {
            port?: string | undefined;
        };
    };
    out: {
        json: {
            port?: string | undefined;
        };
    };
}, Promise<(Response & import("hono").TypedResponse<`gateway \u306E\u8D77\u52D5\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${string}`, 500, "text">) | (Response & import("hono").TypedResponse<`gateway \u3092\u30DD\u30FC\u30C8 ${number} \u3067\u8D77\u52D5\u3057\u307E\u3057\u305F (Ctrl+C \u3067\u505C\u6B62)`, import("hono/utils/http-status").ContentfulStatusCode, "text">)>>];
export default _default;
