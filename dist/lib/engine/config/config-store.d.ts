import type { MinionFileSystem } from "../fs/file-system.ts";
type Props = {
    fs: MinionFileSystem;
    path: string;
};
/**
 * One-time copy of the pre-0.5 config (`~/.minion/config.json`) to the XDG
 * location (`~/.config/minion/config.json`). The legacy file is left in place
 * so a downgrade keeps working; once the new file exists it always wins.
 */
export declare function migrateLegacyConfigFile(props: {
    fs: MinionFileSystem;
    from: string;
    to: string;
}): Error | null;
/** Reads/writes the flat string-keyed `config.json` (`minion config get/set/list`). */
export declare class MinionConfigStore {
    private readonly store;
    constructor(props: Props);
    list(): Record<string, string>;
    /** Returns `undefined` when the key is unset — distinguishable from an empty-string value. */
    get(key: string): string | undefined;
    set(key: string, value: string): Error | null;
}
export {};
