import { dirname } from "node:path";
import { z } from "zod";
import { JsonFileStore } from "../fs/json-file-store.js";
/**
 * One-time copy of the pre-0.5 config (`~/.minion/config.json`) to the XDG
 * location (`~/.config/minion/config.json`). The legacy file is left in place
 * so a downgrade keeps working; once the new file exists it always wins.
 */
export function migrateLegacyConfigFile(props) {
    if (props.from === props.to)
        return null;
    if (props.fs.existsSync(props.to))
        return null;
    if (!props.fs.existsSync(props.from))
        return null;
    const content = props.fs.readFileSync(props.from);
    if (content instanceof Error)
        return content;
    const mkdirError = props.fs.mkdirSync(dirname(props.to), { recursive: true });
    if (mkdirError)
        return mkdirError;
    return props.fs.writeFileSync(props.to, content);
}
const schema = z.record(z.string(), z.string());
const EMPTY = {};
/** Reads/writes the flat string-keyed `config.json` (`minion config get/set/list`). */
export class MinionConfigStore {
    store;
    constructor(props) {
        this.store = new JsonFileStore({ fs: props.fs, path: props.path, schema, defaultValue: EMPTY });
    }
    list() {
        return this.store.read();
    }
    /** Returns `undefined` when the key is unset — distinguishable from an empty-string value. */
    get(key) {
        return this.list()[key];
    }
    set(key, value) {
        const config = this.list();
        config[key] = value;
        return this.store.write(config);
    }
}
