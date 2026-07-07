export const IDLE_CLIP = 0;
// Swift側 PetView.clips と同じ並び順・重み(合計100)。座標や速度はSwiftが持つ
// clip定義とスクリーン形状に依存するため、ここでは「どの行動を・どれだけ続けるか」だけを決める。
export const ACTIONS = [
    { weight: 14, durationMs: [3000, 6000] }, // 0 待機
    { weight: 10, durationMs: [3000, 6000] }, // 1 歩く
    { weight: 28, durationMs: [4000, 7000] }, // 2 走る
    { weight: 3, durationMs: [1000, 2000] }, // 3 ジャンプ1
    { weight: 3, durationMs: [1000, 2000] }, // 4 ジャンプ2
    { weight: 3, durationMs: [1000, 2000] }, // 5 ジャンプ3
    { weight: 3, durationMs: [1000, 2000] }, // 6 ジャンプ4
    { weight: 8, durationMs: [4000, 7000] }, // 7 座る1
    { weight: 8, durationMs: [4000, 7000] }, // 8 座る2
    { weight: 8, durationMs: [4000, 7000] }, // 9 座る3
    { weight: 8, durationMs: [4000, 7000] }, // 10 座る4
    { weight: 2, durationMs: [2000, 3000] }, // 11 食べる1
    { weight: 2, durationMs: [2000, 3000] }, // 12 食べる2
];
// 稼働していないセッション用の「静かな」行動だけの部分集合(clipIndexはACTIONS/Swiftの
// 並びを指す)。移動・ジャンプ・食事は含めず、待機と座り姿勢をゆっくり切り替える。
export const SLEEPING_ACTIONS = [
    { clipIndex: 0, weight: 40, durationMs: [6000, 12000] }, // 待機
    { clipIndex: 7, weight: 15, durationMs: [6000, 12000] }, // 座る1
    { clipIndex: 8, weight: 15, durationMs: [6000, 12000] }, // 座る2
    { clipIndex: 9, weight: 15, durationMs: [6000, 12000] }, // 座る3
    { clipIndex: 10, weight: 15, durationMs: [6000, 12000] }, // 座る4
];
// ゲーム中のフレンド用: 落ち着いて座り込み、ときどきおやつを食べる。
// (clipIndexはACTIONS/Swiftの並びを指す)
export const GAMING_ACTIONS = [
    { clipIndex: 7, weight: 22, durationMs: [5000, 10000] }, // 座る1
    { clipIndex: 8, weight: 22, durationMs: [5000, 10000] }, // 座る2
    { clipIndex: 9, weight: 22, durationMs: [5000, 10000] }, // 座る3
    { clipIndex: 10, weight: 22, durationMs: [5000, 10000] }, // 座る4
    { clipIndex: 11, weight: 6, durationMs: [2000, 3000] }, // 食べる1
    { clipIndex: 12, weight: 6, durationMs: [2000, 3000] }, // 食べる2
];
export function pickAction(random) {
    const roll = random.next() * 100;
    let cumulative = 0;
    let chosen = IDLE_CLIP;
    for (let i = 0; i < ACTIONS.length; i++) {
        const action = ACTIONS[i];
        if (!action)
            continue;
        cumulative += action.weight;
        if (roll < cumulative) {
            chosen = i;
            break;
        }
    }
    const chosenAction = ACTIONS[chosen];
    const [min, max] = chosenAction?.durationMs ?? [0, 0];
    return { clipIndex: chosen, durationMs: min + random.next() * (max - min) };
}
export function pickSleepingAction(random) {
    return pickFromSubset(random, SLEEPING_ACTIONS);
}
export function pickGamingAction(random) {
    return pickFromSubset(random, GAMING_ACTIONS);
}
function pickFromSubset(random, actions) {
    const roll = random.next() * 100;
    let cumulative = 0;
    let chosen = actions[0];
    for (const action of actions) {
        cumulative += action.weight;
        if (roll < cumulative) {
            chosen = action;
            break;
        }
    }
    const [min, max] = chosen?.durationMs ?? [0, 0];
    return {
        clipIndex: chosen?.clipIndex ?? IDLE_CLIP,
        durationMs: min + random.next() * (max - min),
    };
}
/**
 * Pure per-session state machine: given the latest active-session snapshot and
 * the current time, decides each pet's animation clip and how long it plays.
 * Holds no IO — safe to tick from a test with a fake clock and random source.
 */
export class PetBehaviorEngine {
    random;
    behaviors = new Map();
    constructor(props) {
        this.random = props.random;
    }
    /** Advances state given `now` and the latest active sessions. Returns whether anything changed. */
    tick(now, activeSessions) {
        let dirty = false;
        for (const id of this.behaviors.keys()) {
            if (!activeSessions.has(id)) {
                this.behaviors.delete(id);
                dirty = true;
            }
        }
        for (const [id, info] of activeSessions) {
            const gaming = info.running && info.activity === "gaming";
            const existing = this.behaviors.get(id);
            if (!existing) {
                const action = this.pick(info.running, gaming);
                this.behaviors.set(id, {
                    running: info.running,
                    gaming,
                    name: info.name,
                    clipIndex: action.clipIndex,
                    actionEndsAt: now + action.durationMs,
                });
                dirty = true;
                continue;
            }
            if (existing.name !== info.name) {
                existing.name = info.name;
                dirty = true;
            }
            if (existing.running !== info.running || existing.gaming !== gaming) {
                existing.running = info.running;
                existing.gaming = gaming;
                // 稼働が止まった/ゲームを始めたときも姿勢を選び直す(走りの途中コマで固まらないように)。
                const action = this.pick(info.running, gaming);
                existing.clipIndex = action.clipIndex;
                existing.actionEndsAt = now + action.durationMs;
                dirty = true;
            }
            else if (now >= existing.actionEndsAt) {
                const action = this.pick(info.running, gaming);
                if (action.clipIndex !== existing.clipIndex)
                    dirty = true;
                existing.clipIndex = action.clipIndex;
                existing.actionEndsAt = now + action.durationMs;
            }
        }
        return dirty;
    }
    snapshot() {
        return Array.from(this.behaviors.entries()).map(([id, b]) => ({
            id,
            state: b.running ? "running" : "sleeping",
            clipIndex: b.clipIndex,
            name: b.name,
            ...(b.gaming ? { activity: "gaming" } : {}),
        }));
    }
    pick(running, gaming) {
        if (!running)
            return pickSleepingAction(this.random);
        if (gaming)
            return pickGamingAction(this.random);
        return pickAction(this.random);
    }
}
