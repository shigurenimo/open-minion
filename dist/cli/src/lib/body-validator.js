import { zValidator } from "@hono/zod-validator";
// zValidator の 400 応答(zod エラーの JSON ダンプ)を CLI 向けの短いテキストにする。
// strict スキーマと組み合わせて、未知のフラグを黙って無視せずエラーにする。
export function bodyValidator(schema) {
    return zValidator("json", schema, (result, c) => {
        if (!result.success) {
            const message = result.error.issues.map((issue) => issue.message).join("\n");
            return c.text(message, 400);
        }
    });
}
