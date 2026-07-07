import { execFile } from "node:child_process"
import * as path from "node:path"
import { app, BrowserWindow, Menu, nativeImage, screen, Tray } from "electron"

// 透明・クリック透過の1枚ウィンドウに全ペットを描く。Swift 版と同じく「壁紙のすぐ上・
// 他のウィンドウの背後」に居座らせる(最前面に重ねるとブラウザ等の上に貫通して邪魔なため)。
// クリック透過ウィンドウは自力で閉じられないため、Tray の「終了」メニューが唯一の出口。
let overlay: BrowserWindow | null = null
let tray: Tray | null = null

// Electron に「最背面へ送る」API はないので、Windows では SetWindowPos(HWND_BOTTOM) を
// 直接呼ぶ。focusable: false + クリック透過なので、一度沈めれば自力で浮上してくることはない。
function sendToDesktopLevel(win: BrowserWindow): void {
  if (process.platform !== "win32") return
  const hwnd = win.getNativeWindowHandle().readBigUInt64LE(0).toString()
  const script =
    `Add-Type -Namespace W -Name U -MemberDefinition ` +
    `'[DllImport("user32.dll")] public static extern bool SetWindowPos(System.IntPtr hWnd, System.IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);'; ` +
    // HWND_BOTTOM = 1, SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE = 0x13
    `[W.U]::SetWindowPos([System.IntPtr]${hwnd}, [System.IntPtr]1, 0, 0, 0, 0, 0x13)`
  execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], () => {})
}

function createOverlay(): void {
  const { workArea } = screen.getPrimaryDisplay()

  overlay = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    focusable: false,
    alwaysOnTop: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      // ローカルの gateway (127.0.0.1) としか通信しない前提の信頼済みページ。
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  // forward: true でマウス移動イベントだけはページへ届く (ホバーで名前ラベルを出すため)。
  overlay.setIgnoreMouseEvents(true, { forward: true })
  overlay.webContents.on("did-finish-load", () => {
    if (overlay) sendToDesktopLevel(overlay)
  })
  void overlay.loadFile(path.join(__dirname, "..", "src", "renderer", "index.html"))
}

function createTray(): void {
  // スプライトシート左上の1コマ (待機の1フレーム目) をそのままトレイアイコンにする。
  const sheet = nativeImage.createFromPath(path.join(__dirname, "..", "assets", "ChickBlue.png"))
  const icon = sheet.isEmpty() ? sheet : sheet.crop({ x: 0, y: 0, width: 16, height: 16 })

  tray = new Tray(icon)
  tray.setToolTip("open-minion")
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "再接続",
        click: () => overlay?.webContents.reload(),
      },
      { type: "separator" },
      {
        label: "終了",
        click: () => app.quit(),
      },
    ]),
  )
}

void app.whenReady().then(() => {
  createOverlay()
  createTray()

  // ディスプレイ構成が変わったらワークエリアに合わせ直し、背面へ沈め直す。
  screen.on("display-metrics-changed", () => {
    if (!overlay) return
    const { workArea } = screen.getPrimaryDisplay()
    overlay.setBounds(workArea)
    sendToDesktopLevel(overlay)
  })
})

app.on("window-all-closed", () => {
  app.quit()
})
