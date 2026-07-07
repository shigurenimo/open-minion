import { MinionFileSystem } from "./file-system.js";
export class MemoryMinionFileSystem extends MinionFileSystem {
    dirs;
    files;
    mtimes;
    now;
    constructor(props = {}) {
        super();
        this.dirs = new Set(props.dirs ?? []);
        this.files = new Map(Object.entries(props.files ?? {}));
        this.mtimes = new Map(Object.entries(props.mtimes ?? {}));
        this.now = props.now ?? (() => Date.now());
    }
    existsSync(path) {
        return this.dirs.has(path) || this.files.has(path);
    }
    readFileSync(path) {
        const data = this.files.get(path);
        if (data === undefined)
            return new Error(`not found: ${path}`);
        return data;
    }
    writeFileSync(path, data) {
        this.files.set(path, data);
        this.touch(path);
        return null;
    }
    mkdirSync(path, options) {
        void options;
        this.dirs.add(path);
        return null;
    }
    rmSync(path, options) {
        if (!options?.force && !this.existsSync(path)) {
            return new Error(`not found: ${path}`);
        }
        this.files.delete(path);
        this.dirs.delete(path);
        this.mtimes.delete(path);
        return null;
    }
    readdirSync(path) {
        const prefix = path.endsWith("/") ? path : `${path}/`;
        const names = new Set();
        for (const file of this.files.keys()) {
            if (!file.startsWith(prefix))
                continue;
            const rest = file.slice(prefix.length);
            const [first] = rest.split("/");
            if (first)
                names.add(first);
        }
        return Array.from(names);
    }
    /** Returns file paths only (no directory entries), unlike node:fs's recursive readdirSync. */
    readdirRecursiveSync(path) {
        const prefix = path.endsWith("/") ? path : `${path}/`;
        const names = [];
        for (const file of this.files.keys()) {
            if (!file.startsWith(prefix))
                continue;
            names.push(file.slice(prefix.length));
        }
        return names;
    }
    createExclusiveSync(path) {
        if (this.files.has(path))
            return false;
        this.files.set(path, "");
        this.touch(path);
        return true;
    }
    statSync(path) {
        if (!this.files.has(path))
            return new Error(`not found: ${path}`);
        const mtimeMs = this.mtimes.get(path);
        if (mtimeMs === undefined)
            this.touch(path);
        return { mtimeMs: this.mtimes.get(path) ?? this.now() };
    }
    /** Sets a file's mtime explicitly — useful for asserting "unchanged since last scan" behavior in tests. */
    setMtime(path, mtimeMs) {
        this.mtimes.set(path, mtimeMs);
    }
    touch(path) {
        this.mtimes.set(path, this.now());
    }
}
