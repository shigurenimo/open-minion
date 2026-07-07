import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, } from "node:fs";
import { toError } from "../errors.js";
import { MinionFileSystem } from "./file-system.js";
export class NodeMinionFileSystem extends MinionFileSystem {
    existsSync(path) {
        return existsSync(path);
    }
    readFileSync(path) {
        try {
            return readFileSync(path, "utf8");
        }
        catch (thrown) {
            return toError(thrown);
        }
    }
    writeFileSync(path, data) {
        try {
            writeFileSync(path, data);
            return null;
        }
        catch (thrown) {
            return toError(thrown);
        }
    }
    mkdirSync(path, options) {
        try {
            mkdirSync(path, { recursive: options?.recursive ?? false });
            return null;
        }
        catch (thrown) {
            return toError(thrown);
        }
    }
    rmSync(path, options) {
        try {
            rmSync(path, { force: options?.force ?? false });
            return null;
        }
        catch (thrown) {
            return toError(thrown);
        }
    }
    readdirSync(path) {
        try {
            return readdirSync(path);
        }
        catch (thrown) {
            return toError(thrown);
        }
    }
    readdirRecursiveSync(path) {
        try {
            return readdirSync(path, { recursive: true });
        }
        catch (thrown) {
            return toError(thrown);
        }
    }
    createExclusiveSync(path) {
        try {
            closeSync(openSync(path, "wx"));
            return true;
        }
        catch {
            return false;
        }
    }
    statSync(path) {
        try {
            return { mtimeMs: statSync(path).mtimeMs };
        }
        catch (thrown) {
            return toError(thrown);
        }
    }
}
