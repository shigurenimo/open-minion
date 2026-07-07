import { type MinionFileStat, MinionFileSystem } from "./file-system.ts";
export declare class NodeMinionFileSystem extends MinionFileSystem {
    existsSync(path: string): boolean;
    readFileSync(path: string): string | Error;
    writeFileSync(path: string, data: string): Error | null;
    mkdirSync(path: string, options?: {
        recursive?: boolean;
    }): Error | null;
    rmSync(path: string, options?: {
        force?: boolean;
    }): Error | null;
    readdirSync(path: string): string[] | Error;
    readdirRecursiveSync(path: string): string[] | Error;
    createExclusiveSync(path: string): boolean;
    statSync(path: string): MinionFileStat | Error;
}
