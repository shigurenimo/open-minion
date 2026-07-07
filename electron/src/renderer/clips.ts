// スプライトクリップ定義。
//
// !! 3点同期必須 !!
// この並び順 (clipIndex) は次の2つと完全に一致していなければならない:
//   - lib/engine/gateway/pet-behavior.ts の ACTIONS (どのクリップを何秒続けるかを決める側)
//   - swift/Sources/open-minion/open_minion.swift の PetView.clips (macOS 側レンダラー)
// gateway は clipIndex だけを送ってくるため、並びがずれると別の動作が再生される。
//
// 素材は ChickBlue.png (128x304, セル16x16, 8列x19行)。row はシート上の行番号 (上から0)。
export type Clip = {
  row: number
  frameCount: number
  fps: number
  /** 0 = その場で再生、>0 = 走るときの移動速度 (px/tick, 30fps) */
  moveSpeed: number
}

export const CLIPS: Clip[] = [
  { row: 0, frameCount: 4, fps: 4, moveSpeed: 0 }, // 0 待機
  { row: 1, frameCount: 7, fps: 10, moveSpeed: 0 }, // 1 歩く(静止して見えるため移動なし)
  { row: 2, frameCount: 8, fps: 12, moveSpeed: 2.0 }, // 2 走る(唯一の移動動作)
  { row: 3, frameCount: 7, fps: 8, moveSpeed: 0 }, // 3 ジャンプ1
  { row: 4, frameCount: 7, fps: 8, moveSpeed: 0 }, // 4 ジャンプ2
  { row: 5, frameCount: 7, fps: 8, moveSpeed: 0 }, // 5 ジャンプ3
  { row: 6, frameCount: 7, fps: 8, moveSpeed: 0 }, // 6 ジャンプ4
  { row: 7, frameCount: 5, fps: 6, moveSpeed: 0 }, // 7 座る1
  { row: 8, frameCount: 4, fps: 6, moveSpeed: 0 }, // 8 座る2
  { row: 9, frameCount: 5, fps: 6, moveSpeed: 0 }, // 9 座る3
  { row: 10, frameCount: 4, fps: 6, moveSpeed: 0 }, // 10 座る4
  { row: 12, frameCount: 2, fps: 4, moveSpeed: 0 }, // 11 食べる1
  { row: 14, frameCount: 7, fps: 8, moveSpeed: 0 }, // 12 食べる2
]

export const IDLE_CLIP = 0
export const CELL = 16
export const PET_SIZE = 64
