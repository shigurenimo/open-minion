/**
 * Randomness boundary used by the pet behavior picker. Default NodeMinionRandomSource
 * wraps `Math.random()`; MemoryMinionRandomSource replays a fixed sequence of values
 * for deterministic action-selection tests.
 */
export abstract class MinionRandomSource {
  /** A pseudo-random number in [0, 1), same contract as `Math.random()`. */
  abstract next(): number
}
