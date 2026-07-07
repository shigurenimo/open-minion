// gateway (ws://127.0.0.1:4756/ws) のスナップショットを受けて全ペットを1枚の
// canvas に描く。行動の選択 (clipIndex・継続時間) は gateway 側が決め、こちらは
// Swift 版と同じく「コマ送り・移動・端で跳ね返る」の物理だけを持つ。
import { CELL, CLIPS, IDLE_CLIP, PET_SIZE } from "./clips"

const GATEWAY_WS_URL = "ws://127.0.0.1:4756/ws"
const RECONNECT_MS = 3000
const TICK_FPS = 30

type GatewaySession = {
  id: string
  state: "running" | "sleeping"
  clipIndex: number
  name: string
  activity?: "gaming"
}

type Pet = {
  x: number
  y: number
  velocityX: number
  velocityY: number
  facingLeft: boolean
  clipIndex: number
  frameIndex: number
  frameTicks: number
  sleeping: boolean
  gaming: boolean
  name: string
}

const canvas = document.getElementById("stage") as HTMLCanvasElement
const nameLabel = document.getElementById("name-label") as HTMLDivElement
const ctx = canvas.getContext("2d")
if (!ctx) throw new Error("canvas 2d context unavailable")

canvas.width = window.innerWidth
canvas.height = window.innerHeight
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
})

const sheet = new Image()
sheet.src = "../../assets/ChickBlue.png"

const pets = new Map<string, Pet>()
let mouseX = -1
let mouseY = -1

function spawnPet(session: GatewaySession): Pet {
  const pet: Pet = {
    x: Math.random() * Math.max(1, canvas.width - PET_SIZE),
    y: Math.random() * Math.max(1, canvas.height - PET_SIZE),
    velocityX: 0,
    velocityY: 0,
    // スポーン時の向きはランダム。移動する行動を取るまでこの向きを保つ (Swift版と同じ)。
    facingLeft: Math.random() < 0.5,
    clipIndex: IDLE_CLIP,
    frameIndex: 0,
    frameTicks: 0,
    sleeping: session.state === "sleeping",
    gaming: session.activity === "gaming",
    name: session.name,
  }
  applyAction(pet, session.clipIndex)
  return pet
}

// 新しい行動を開始する。移動する行動なら向きと速度をランダムに選び直す。
function applyAction(pet: Pet, newClip: number): void {
  if (newClip === pet.clipIndex) return
  pet.clipIndex = newClip
  pet.frameIndex = 0
  pet.frameTicks = 0

  const clip = CLIPS[newClip] ?? CLIPS[IDLE_CLIP]
  if (clip && clip.moveSpeed > 0) {
    const angle = Math.random() * 2 * Math.PI
    pet.velocityX = clip.moveSpeed * Math.cos(angle)
    pet.velocityY = clip.moveSpeed * Math.sin(angle)
    pet.facingLeft = pet.velocityX < 0
  } else {
    pet.velocityX = 0
    pet.velocityY = 0
  }
}

function reconcile(sessions: GatewaySession[]): void {
  const incoming = new Set(sessions.map((s) => s.id))
  for (const id of pets.keys()) {
    if (!incoming.has(id)) pets.delete(id)
  }

  for (const session of sessions) {
    const existing = pets.get(session.id)
    if (!existing) {
      pets.set(session.id, spawnPet(session))
      continue
    }
    existing.sleeping = session.state === "sleeping"
    existing.gaming = session.activity === "gaming"
    existing.name = session.name
    applyAction(existing, session.clipIndex)
  }

  // 画面には出ないが、タスクマネージャや DevTools から生存確認できるようにしておく。
  document.title = `open-minion (${pets.size})`
}

// 現在の速度を反映して移動し、画面端で跳ね返る。寝ている間は動かない。
function stepPet(pet: Pet): void {
  if (pet.sleeping || (pet.velocityX === 0 && pet.velocityY === 0)) return

  pet.x += pet.velocityX
  pet.y += pet.velocityY

  const maxX = canvas.width - PET_SIZE
  const maxY = canvas.height - PET_SIZE
  if (pet.x < 0) {
    pet.x = 0
    pet.velocityX = Math.abs(pet.velocityX)
  } else if (pet.x > maxX) {
    pet.x = maxX
    pet.velocityX = -Math.abs(pet.velocityX)
  }
  if (pet.y < 0) {
    pet.y = 0
    pet.velocityY = Math.abs(pet.velocityY)
  } else if (pet.y > maxY) {
    pet.y = maxY
    pet.velocityY = -Math.abs(pet.velocityY)
  }
  pet.facingLeft = pet.velocityX < 0
}

function advanceFrame(pet: Pet): void {
  const clip = CLIPS[pet.clipIndex] ?? CLIPS[IDLE_CLIP]
  if (!clip) return
  pet.frameTicks += 1
  // Swift版と同じく素材本来のfpsの半分の速度でコマ送りする (tickは30fps、計算は60ベース)。
  const ticksPerFrame = Math.max(1, Math.round(60 / clip.fps))
  if (pet.frameTicks >= ticksPerFrame) {
    pet.frameTicks = 0
    pet.frameIndex = (pet.frameIndex + 1) % clip.frameCount
  }
}

function drawPet(pet: Pet): void {
  if (!ctx) return
  const clip = CLIPS[pet.clipIndex] ?? CLIPS[IDLE_CLIP]
  if (!clip) return

  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.globalAlpha = pet.sleeping ? 0.6 : 1.0

  // sprite は右向きに描かれているため、左向きのときは水平反転する。
  if (pet.facingLeft) {
    ctx.translate(pet.x + PET_SIZE, pet.y)
    ctx.scale(-1, 1)
  } else {
    ctx.translate(pet.x, pet.y)
  }
  ctx.drawImage(
    sheet,
    (pet.frameIndex % clip.frameCount) * CELL,
    clip.row * CELL,
    CELL,
    CELL,
    0,
    0,
    PET_SIZE,
    PET_SIZE,
  )
  ctx.restore()

  if (pet.gaming && !pet.sleeping) {
    ctx.save()
    ctx.font = "20px system-ui"
    ctx.textAlign = "center"
    ctx.fillText("🎮", pet.x + PET_SIZE / 2, pet.y - 4)
    ctx.restore()
  }
}

function updateNameLabel(): void {
  let hovered: Pet | null = null
  for (const pet of pets.values()) {
    if (
      mouseX >= pet.x &&
      mouseX < pet.x + PET_SIZE &&
      mouseY >= pet.y &&
      mouseY < pet.y + PET_SIZE
    ) {
      hovered = pet
      break
    }
  }

  if (hovered && hovered.name !== "") {
    nameLabel.textContent = hovered.name
    nameLabel.style.display = "block"
    nameLabel.style.left = `${hovered.x + PET_SIZE / 2 - nameLabel.offsetWidth / 2}px`
    nameLabel.style.top = `${hovered.y + PET_SIZE + 4}px`
  } else {
    nameLabel.style.display = "none"
  }
}

function tick(): void {
  if (!ctx) return
  for (const pet of pets.values()) {
    stepPet(pet)
    advanceFrame(pet)
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const pet of pets.values()) drawPet(pet)
  updateNameLabel()
}

function connect(): void {
  const socket = new WebSocket(GATEWAY_WS_URL)
  socket.addEventListener("message", (event) => {
    if (typeof event.data !== "string") return
    try {
      const message = JSON.parse(event.data) as { sessions?: GatewaySession[] }
      if (Array.isArray(message.sessions)) reconcile(message.sessions)
    } catch {
      // 壊れたフレームは無視する
    }
  })
  // Swift版と同じく3秒後に再接続。ペットは消さず最後の状態のまま待つ。
  socket.addEventListener("close", () => setTimeout(connect, RECONNECT_MS))
  socket.addEventListener("error", () => socket.close())
}

window.addEventListener("mousemove", (event) => {
  mouseX = event.clientX
  mouseY = event.clientY
})

setInterval(tick, 1000 / TICK_FPS)
connect()
