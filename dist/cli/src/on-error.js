import { HTTPException } from "hono/http-exception";
export const onError = (err, c) => {
    if (err instanceof HTTPException) {
        return c.text(err.message, err.status);
    }
    return c.text(err.message, 500);
};
