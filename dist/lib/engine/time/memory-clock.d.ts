import { MinionClock } from "./clock.ts";
type Props = {
    start?: Date;
};
export declare class MemoryMinionClock extends MinionClock {
    private current;
    constructor(props?: Props);
    now(): Date;
    set(date: Date): void;
    advance(ms: number): void;
}
export {};
