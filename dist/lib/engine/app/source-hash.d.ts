import type { MinionFileSystem } from "../fs/file-system.ts";
type Props = {
    fs: MinionFileSystem;
    appRoot: string;
};
/**
 * Hashes `Package.swift` plus every `.swift` file under `Sources/`, so a release
 * build can be skipped when the source tree hasn't changed since the last build.
 * Returns an Error when the tree can't be read — callers treat that as "hash
 * unknown", i.e. rebuild.
 */
export declare function computeSourceHash(props: Props): string | Error;
export {};
