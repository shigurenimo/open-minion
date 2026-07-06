import type { ErrorHandler } from "hono"
import { HTTPException } from "hono/http-exception"

export const onError: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.text(err.message, err.status)
  }

  return c.text(err.message, 500)
}
