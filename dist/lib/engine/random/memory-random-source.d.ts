import { MinionRandomSource } from "./random-source.ts";
type Props = {
    /** Values replayed in order, then repeated from the start once exhausted. Defaults to always `0`. */
    values?: number[];
};
export declare class MemoryMinionRandomSource extends MinionRandomSource {
    private readonly values;
    private index;
    constructor(props?: Props);
    next(): number;
}
export {};
