import { z } from "zod";
import { factory } from "../../factory.js";
import { bodyValidator } from "../../lib/body-validator.js";
import { formatAppStatus } from "../../lib/format.js";
import { helpGuard } from "../../lib/help-guard.js";
const schema = z.strictObject({});
export const help = `Usage: minion status

アプリとgatewayの起動状況を表示する。`;
export default factory.createHandlers(helpGuard(help), bodyValidator(schema), async (c) => {
    return c.text(formatAppStatus(c.env.minion.app.status()));
});
