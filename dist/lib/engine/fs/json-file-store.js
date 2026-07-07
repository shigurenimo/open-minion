import { dirname } from "node:path";
import { safeJsonParse } from "../errors.js";
/**
 * Reads/writes a single JSON value at `path`, creating parent directories as
 * needed. Falls back to a fresh clone of `defaultValue` when the file is
 * missing, unreadable, corrupt, or fails `schema` validation. Shared by every
 * `~/.minion/*.json` store (config, session stats, token usage, collection)
 * to avoid re-deriving the same read/parse/validate/write boilerplate in each one.
 */
export class JsonFileStore {
    fs;
    path;
    schema;
    defaultValue;
    constructor(props) {
        this.fs = props.fs;
        this.path = props.path;
        this.schema = props.schema;
        this.defaultValue = props.defaultValue;
    }
    read() {
        if (!this.fs.existsSync(this.path))
            return structuredClone(this.defaultValue);
        const content = this.fs.readFileSync(this.path);
        if (content instanceof Error)
            return structuredClone(this.defaultValue);
        const json = safeJsonParse(content);
        if (json instanceof Error)
            return structuredClone(this.defaultValue);
        const result = this.schema.safeParse(json);
        return result.success ? result.data : structuredClone(this.defaultValue);
    }
    write(value) {
        const mkdirError = this.fs.mkdirSync(dirname(this.path), { recursive: true });
        if (mkdirError)
            return mkdirError;
        return this.fs.writeFileSync(this.path, JSON.stringify(value, null, 2));
    }
}
