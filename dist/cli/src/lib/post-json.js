// POST + JSON body の RequestInit を作る。Hono の app.request に渡す。
export function postJson(body = {}) {
    return {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    };
}
