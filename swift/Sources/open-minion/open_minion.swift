import AppKit
import CoreGraphics
import Foundation

private let gatewayURL = URL(string: "ws://127.0.0.1:4756/ws")!

@main
@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var pets: [String: Pet] = [:]
    private var systemAsleep = false
    private var timer: Timer?
    private var webSocketTask: URLSessionWebSocketTask?

    static func main() {
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.delegate = delegate
        app.setActivationPolicy(.accessory)
        app.run()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        setupPowerObservers()
        startLoop()
        connectGateway()
    }

    private func setupPowerObservers() {
        let nc = NSWorkspace.shared.notificationCenter
        nc.addObserver(self, selector: #selector(systemWillSleep),
                       name: NSWorkspace.willSleepNotification, object: nil)
        nc.addObserver(self, selector: #selector(systemDidWake),
                       name: NSWorkspace.didWakeNotification, object: nil)
    }

    @objc private func systemWillSleep() {
        systemAsleep = true
    }

    @objc private func systemDidWake() {
        systemAsleep = false
    }

    private func startLoop() {
        let t = Timer(timeInterval: 1.0 / 30.0, target: self,
                      selector: #selector(tick), userInfo: nil, repeats: true)
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }

    @objc private func tick() {
        let mouseLocation = NSEvent.mouseLocation
        // 実ウィンドウが重なっている場所では最前面に上げない(貫通してポップアップしない)ように、
        // カーソルがどれかのペットの上に乗っている時だけ重いオクルージョン判定を行う。
        let hovering = pets.values.contains { $0.containsPoint(mouseLocation) }
        let interactionAllowed = !hovering || !Self.isPointOccludedByRealWindow(mouseLocation)

        for pet in pets.values {
            pet.tick(systemAsleep: systemAsleep, mouseLocation: mouseLocation, interactionAllowedAtCursor: interactionAllowed)
        }
    }

    // 通常のアプリウィンドウ(kCGNormalWindowLevel = 0)がその座標を覆っているかを調べる。
    // 覆われている時にペットを floating まで持ち上げると、他アプリの上に貫通して見えてしまうため。
    // Dock(層20)やControl Center(層25)などのシステムUIは、見た目は小さくても当たり判定が
    // 画面全体に及ぶことがあるため、通常ウィンドウの層(0)だけに絞って除外する。
    private static func isPointOccludedByRealWindow(_ cocoaPoint: NSPoint) -> Bool {
        let referenceHeight = NSScreen.screens.first?.frame.height ?? 0
        let quartzPoint = CGPoint(x: cocoaPoint.x, y: referenceHeight - cocoaPoint.y)

        guard let list = CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID) as? [[String: Any]] else {
            return false
        }
        let myPid = ProcessInfo.processInfo.processIdentifier
        for entry in list {
            guard let ownerPid = entry[kCGWindowOwnerPID as String] as? Int32, ownerPid != myPid else { continue }
            guard let layer = entry[kCGWindowLayer as String] as? Int, layer == 0 else { continue }
            guard let bounds = entry[kCGWindowBounds as String] as? [String: CGFloat] else { continue }
            let rect = CGRect(x: bounds["X"] ?? 0, y: bounds["Y"] ?? 0,
                               width: bounds["Width"] ?? 0, height: bounds["Height"] ?? 0)
            if rect.contains(quartzPoint) { return true }
        }
        return false
    }

    // MARK: - Gateway (~/.claude/sessions を監視する CLI 側の Bun サーバ) との WebSocket 接続

    private struct GatewaySession: Decodable {
        let id: String
        let state: String
        let clipIndex: Int
        let name: String
    }

    private struct GatewayMessage: Decodable {
        let sessions: [GatewaySession]
    }

    private func connectGateway() {
        let task = URLSession(configuration: .default).webSocketTask(with: gatewayURL)
        webSocketTask = task
        task.resume()
        receiveGatewayMessage()
    }

    private func receiveGatewayMessage() {
        webSocketTask?.receive { [weak self] result in
            Task { @MainActor in
                guard let self else { return }
                switch result {
                case .success(let message):
                    switch message {
                    case .string(let text):
                        self.handleGatewayMessage(text)
                    case .data(let data):
                        if let text = String(data: data, encoding: .utf8) {
                            self.handleGatewayMessage(text)
                        }
                    @unknown default:
                        break
                    }
                    self.receiveGatewayMessage()
                case .failure:
                    self.scheduleGatewayReconnect()
                }
            }
        }
    }

    private func scheduleGatewayReconnect() {
        webSocketTask = nil
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
            self?.connectGateway()
        }
    }

    private func handleGatewayMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let message = try? JSONDecoder().decode(GatewayMessage.self, from: data) else { return }
        reconcile(message.sessions)
    }

    // Gateway から届いたセッション一覧に合わせて Pet を増減させ、running/sleeping を反映する。
    private func reconcile(_ sessions: [GatewaySession]) {
        let incomingIds = Set(sessions.map(\.id))
        for id in Set(pets.keys).subtracting(incomingIds) {
            pets[id]?.remove()
            pets.removeValue(forKey: id)
        }

        for session in sessions {
            let running = session.state == "running"
            let pet = pets[session.id] ?? {
                let pet = Pet()
                pets[session.id] = pet
                return pet
            }()
            pet.sessionRunning = running
            pet.sessionName = session.name
            pet.applyAction(clipIndex: session.clipIndex)
        }
    }
}

// Custom window so clicking the pet doesn't steal key/main from the active app.
final class PetWindow: NSWindow {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

// 1匹のペットが持つ見た目・アニメーション・自律行動・ドラッグ状態をすべて内包する。
// Gateway のセッション1件につき1つ生成/破棄される。
@MainActor
final class Pet {
    let window: PetWindow
    let petView: PetView

    var sessionRunning = true

    private var isGrabbed = false
    private var grabOffset: NSPoint = .zero

    private var facingLeft = false
    private var clipIndex = PetView.idleClipIndex
    private var frameIndex = 0
    private var frameTicksAccumulated = 0
    private var velocityX: CGFloat = 0
    private var velocityY: CGFloat = 0

    // Gatewayから最後に指示された行動。えさやり演出が終わったらこれに復帰する。
    private var networkClipIndex = PetView.idleClipIndex
    private var feedTicksRemaining = 0

    var sessionName = ""
    private var nameLabelVisible = false
    private let nameLabel: NSTextField
    private let nameWindow: NSWindow

    private static let windowSize: CGFloat = 64.0
    // 通常時は壁紙のすぐ上(他ウィンドウの背後)に沈める。カーソルが重なった/掴んでいる間だけ
    // floating まで一時的に持ち上げて最前面に出し、クリックを確実に受け取れるようにする。
    private static let restingLevel = NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopWindow)) + 1)
    private static let activeLevel = NSWindow.Level.floating

    init() {
        let size = NSSize(width: Self.windowSize, height: Self.windowSize)
        let window = PetWindow(
            contentRect: NSRect(origin: .zero, size: size),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        window.isOpaque = false
        window.backgroundColor = .clear
        window.hasShadow = false
        window.level = Self.restingLevel
        window.ignoresMouseEvents = true
        window.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]

        let petView = PetView(frame: NSRect(origin: .zero, size: size))
        window.contentView = petView

        self.window = window
        self.petView = petView

        let nameLabel = NSTextField(labelWithString: "")
        nameLabel.font = .systemFont(ofSize: 11, weight: .medium)
        nameLabel.textColor = .white
        nameLabel.alignment = .center
        nameLabel.drawsBackground = false
        nameLabel.wantsLayer = true
        nameLabel.layer?.backgroundColor = NSColor.black.withAlphaComponent(0.75).cgColor
        nameLabel.layer?.cornerRadius = 6
        nameLabel.layer?.masksToBounds = true

        let nameWindow = NSWindow(
            contentRect: .zero,
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        nameWindow.isOpaque = false
        nameWindow.backgroundColor = .clear
        nameWindow.hasShadow = true
        nameWindow.level = Self.activeLevel
        nameWindow.ignoresMouseEvents = true
        nameWindow.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
        nameWindow.contentView = nameLabel

        self.nameLabel = nameLabel
        self.nameWindow = nameWindow

        petView.onGrab = { [weak self] localPoint in
            guard let self else { return }
            self.isGrabbed = true
            self.grabOffset = localPoint
            self.petView.isGrabbed = true
        }
        petView.onDrag = { [weak self] screenPoint in
            guard let self, self.isGrabbed else { return }
            self.window.setFrameOrigin(
                NSPoint(x: screenPoint.x - self.grabOffset.x,
                        y: screenPoint.y - self.grabOffset.y)
            )
        }
        petView.onRelease = { [weak self] in
            guard let self else { return }
            self.isGrabbed = false
            self.petView.isGrabbed = false
        }
        petView.onFeed = { [weak self] in
            self?.feed()
        }

        if let screen = NSScreen.screens.randomElement() ?? NSScreen.main {
            let f = screen.visibleFrame
            let x = CGFloat.random(in: f.minX...max(f.minX, f.maxX - size.width))
            let y = CGFloat.random(in: f.minY...max(f.minY, f.maxY - size.height))
            window.setFrameOrigin(NSPoint(x: x, y: y))
        }

        window.orderFrontRegardless()
    }

    // Gatewayから届いた「次の行動」を適用する。えさやり中は割り込まず、終わってから反映する。
    func applyAction(clipIndex newClip: Int) {
        networkClipIndex = newClip
        guard feedTicksRemaining == 0 else { return }
        beginAction(newClip)
    }

    // ダブルクリック/右クリックメニューからの即時ローカル操作。Gatewayの指示より優先する。
    func feed() {
        feedTicksRemaining = Int(3.0 * 30.0)
        beginAction(PetView.eatClipIndex)
    }

    func remove() {
        window.orderOut(nil)
        nameWindow.orderOut(nil)
    }

    private func setNameLabelVisible(_ visible: Bool) {
        guard visible != nameLabelVisible else { return }
        nameLabelVisible = visible
        if visible {
            positionNameWindow()
            nameWindow.orderFrontRegardless()
        } else {
            nameWindow.orderOut(nil)
        }
    }

    private func positionNameWindow() {
        guard !sessionName.isEmpty else { return }
        nameLabel.stringValue = sessionName
        nameLabel.sizeToFit()

        let horizontalPadding: CGFloat = 6
        let verticalPadding: CGFloat = 3
        let width = nameLabel.frame.width + horizontalPadding * 2
        let height = nameLabel.frame.height + verticalPadding * 2
        nameLabel.frame = NSRect(x: horizontalPadding, y: verticalPadding,
                                  width: nameLabel.frame.width, height: nameLabel.frame.height)

        let petFrame = window.frame
        let x = petFrame.midX - width / 2
        let y = petFrame.minY - height - 4
        nameWindow.setFrame(NSRect(x: x, y: y, width: width, height: height), display: true)
    }

    func tick(systemAsleep: Bool, mouseLocation: NSPoint, interactionAllowedAtCursor: Bool) {
        if systemAsleep {
            setInteractive(false)
            setNameLabelVisible(false)
            petView.isAsleep = true
            return
        }

        // mouseUp の取りこぼしで isGrabbed が解除されないまま残るケースへの保険。
        if isGrabbed, NSEvent.pressedMouseButtons & 1 == 0 {
            isGrabbed = false
            petView.isGrabbed = false
        }

        let hovering: Bool
        if isGrabbed {
            // While being dragged, keep clicks captured. Skip autonomous behavior.
            hovering = true
            setInteractive(true)
        } else {
            hovering = containsPoint(mouseLocation) && interactionAllowedAtCursor
            setInteractive(hovering)
        }
        setNameLabelVisible(hovering)
        if hovering {
            positionNameWindow()
        }

        // セッションが idle の間は、その場でうずくまって寝る(掴む/なでるはできる)。
        // ただし待機クリップ自体のコマ送りは止めない。止めると単なる1枚絵で固まって見える。
        let sleeping = !sessionRunning
        if !sleeping {
            if feedTicksRemaining > 0 {
                feedTicksRemaining -= 1
                if feedTicksRemaining == 0 {
                    beginAction(networkClipIndex)
                }
            }
            stepBehavior()
        }
        advanceAnimationFrame()

        petView.isAsleep = sleeping
        petView.facingLeft = facingLeft
        petView.clipIndex = clipIndex
        petView.frameIndex = frameIndex
        petView.needsDisplay = true
    }

    // 新しい行動を開始する。表示クリップを切り替え、移動する行動なら向きと速度を選び直す。
    // 「いつ・どの行動にするか」はGateway(またはえさやり)が決め、ここでは物理量だけを初期化する。
    private func beginAction(_ newClip: Int) {
        guard newClip != clipIndex else { return }
        clipIndex = newClip
        frameIndex = 0
        frameTicksAccumulated = 0

        let clip = PetView.clips[newClip]
        if clip.moveSpeed > 0 {
            let angle = Double.random(in: 0..<(2 * .pi))
            velocityX = clip.moveSpeed * CGFloat(cos(angle))
            velocityY = clip.moveSpeed * CGFloat(sin(angle))
            facingLeft = velocityX < 0
        } else {
            velocityX = 0
            velocityY = 0
        }
    }

    // 現在の速度を反映して移動し、画面端で跳ね返る。速度がなければ何もしない。
    private func stepBehavior() {
        guard velocityX != 0 || velocityY != 0 else { return }

        var frame = window.frame
        frame.origin.x += velocityX
        frame.origin.y += velocityY

        let bounds = currentScreenVisibleFrame()
        if frame.origin.x < bounds.minX {
            frame.origin.x = bounds.minX
            velocityX = abs(velocityX)
        } else if frame.origin.x + frame.width > bounds.maxX {
            frame.origin.x = bounds.maxX - frame.width
            velocityX = -abs(velocityX)
        }
        if frame.origin.y < bounds.minY {
            frame.origin.y = bounds.minY
            velocityY = abs(velocityY)
        } else if frame.origin.y + frame.height > bounds.maxY {
            frame.origin.y = bounds.maxY - frame.height
            velocityY = -abs(velocityY)
        }
        facingLeft = velocityX < 0
        window.setFrameOrigin(frame.origin)
    }

    private func advanceAnimationFrame() {
        let clip = PetView.clips[clipIndex]
        frameTicksAccumulated += 1
        // 素材本来のfpsの半分の速度でコマ送りする。
        let ticksPerFrame = max(1, Int((60.0 / clip.fps).rounded()))
        if frameTicksAccumulated >= ticksPerFrame {
            frameTicksAccumulated = 0
            frameIndex = (frameIndex + 1) % clip.frameCount
        }
    }

    private func currentScreenVisibleFrame() -> NSRect {
        let center = NSPoint(x: window.frame.midX, y: window.frame.midY)
        for screen in NSScreen.screens where screen.frame.contains(center) {
            return screen.visibleFrame
        }
        return NSScreen.main?.visibleFrame ?? window.frame
    }

    // カーソルが重なっている/掴んでいる間だけウィンドウを最前面(floating)へ持ち上げ、クリックを
    // 受け取れるようにする。持ち上げないと、上に重なる Finder のデスクトップ(アイコン)ウィンドウや
    // 通常ウィンドウがクリックを先に奪ってしまい、ペットに mouseDown が届かない。
    // 離れている間は壁紙レベルへ戻し、他ウィンドウの背後に沈めておく。
    private func setInteractive(_ interactive: Bool) {
        window.ignoresMouseEvents = !interactive
        let desired = interactive ? Self.activeLevel : Self.restingLevel
        if window.level != desired {
            window.level = desired
        }
    }

    func containsPoint(_ screenPoint: NSPoint) -> Bool {
        let origin = window.frame.origin
        let lx = screenPoint.x - origin.x
        let ly = screenPoint.y - origin.y
        return lx >= 0 && lx < Self.windowSize && ly >= 0 && ly < Self.windowSize
    }
}

@MainActor
final class PetView: NSView {
    struct Clip {
        let row: Int
        let frameCount: Int
        let fps: Double
        let moveSpeed: CGFloat // 0 = その場で再生、>0 = 走るときの移動速度(px/tick)
        let durationRange: ClosedRange<Double> // この動作を続ける秒数
    }

    // Chicken_Baby_Blue.png (128x304, セル16x16, 8列x19行) のうち基本動作のみ使用。
    // row11(はばたく=ジャンプ大)・row13(ハートのみで単体では絵にならない)・row15-18(未使用)は除外。
    // 実機で見た目を確認した結果、歩く(row1)は静止して見えるため移動なし、
    // ついばむ(row3-6)は実際には小ジャンプ、row12/14は仮に食べる動作として扱う。
    static let clips: [Clip] = [
        Clip(row: 0, frameCount: 4, fps: 4, moveSpeed: 0, durationRange: 3.0...6.0),    // 待機
        Clip(row: 1, frameCount: 7, fps: 10, moveSpeed: 0, durationRange: 3.0...6.0),   // 歩く(静止して見えるため移動なし)
        Clip(row: 2, frameCount: 8, fps: 12, moveSpeed: 2.0, durationRange: 4.0...7.0), // 走る(唯一の移動動作)
        Clip(row: 3, frameCount: 7, fps: 8, moveSpeed: 0, durationRange: 1.0...2.0),    // ジャンプ1
        Clip(row: 4, frameCount: 7, fps: 8, moveSpeed: 0, durationRange: 1.0...2.0),    // ジャンプ2
        Clip(row: 5, frameCount: 7, fps: 8, moveSpeed: 0, durationRange: 1.0...2.0),    // ジャンプ3
        Clip(row: 6, frameCount: 7, fps: 8, moveSpeed: 0, durationRange: 1.0...2.0),    // ジャンプ4
        Clip(row: 7, frameCount: 5, fps: 6, moveSpeed: 0, durationRange: 4.0...7.0),    // 座る1
        Clip(row: 8, frameCount: 4, fps: 6, moveSpeed: 0, durationRange: 4.0...7.0),    // 座る2
        Clip(row: 9, frameCount: 5, fps: 6, moveSpeed: 0, durationRange: 4.0...7.0),    // 座る3
        Clip(row: 10, frameCount: 4, fps: 6, moveSpeed: 0, durationRange: 4.0...7.0),   // 座る4
        Clip(row: 12, frameCount: 2, fps: 4, moveSpeed: 0, durationRange: 2.0...3.0),   // 食べる1
        Clip(row: 14, frameCount: 7, fps: 8, moveSpeed: 0, durationRange: 2.0...3.0),   // 食べる2
    ]
    static let idleClipIndex = 0
    static let walkClipIndex = 1
    static let runClipIndex = 2
    static let eatClipIndex = 11

    var facingLeft = false
    var clipIndex = PetView.idleClipIndex
    var frameIndex = 0
    var isGrabbed = false
    var isAsleep = false {
        didSet { needsDisplay = true }
    }

    var onGrab: ((NSPoint) -> Void)?
    var onDrag: ((NSPoint) -> Void)?
    var onRelease: (() -> Void)?
    var onFeed: (() -> Void)?

    private static let cell: CGFloat = 16.0
    private static let sheetRows = 19

    // sprite は右向きに描かれているため、左へ移動するとき(facingLeft == true)は描画時に水平反転する。
    private static let sheet: NSBitmapImageRep = {
        guard let url = Bundle.module.url(forResource: "ChickBlue", withExtension: "png"),
              let data = try? Data(contentsOf: url),
              let bitmap = NSBitmapImageRep(data: data) else {
            fatalError("ChickBlue.png resource not found")
        }
        return bitmap
    }()

    private static let sheetImage: NSImage = {
        let image = NSImage(size: NSSize(width: sheet.pixelsWide, height: sheet.pixelsHigh))
        image.addRepresentation(sheet)
        return image
    }()

    override var isFlipped: Bool { false }
    override var acceptsFirstResponder: Bool { true }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    override func mouseDown(with event: NSEvent) {
        if event.clickCount == 2 {
            onFeed?()
            return
        }
        onGrab?(event.locationInWindow)
    }

    override func mouseDragged(with event: NSEvent) {
        onDrag?(NSEvent.mouseLocation)
    }

    override func mouseUp(with event: NSEvent) {
        onRelease?()
    }

    override func rightMouseDown(with event: NSEvent) {
        let menu = NSMenu()
        let feedItem = NSMenuItem(title: "えさをあげる", action: #selector(handleFeedMenuItem), keyEquivalent: "")
        feedItem.target = self
        menu.addItem(feedItem)
        menu.addItem(.separator())
        let quitItem = NSMenuItem(title: "終了", action: #selector(handleQuitMenuItem), keyEquivalent: "")
        quitItem.target = self
        menu.addItem(quitItem)
        menu.popUp(positioning: nil, at: event.locationInWindow, in: self)
    }

    @objc private func handleFeedMenuItem() {
        onFeed?()
    }

    @objc private func handleQuitMenuItem() {
        NSApp.terminate(nil)
    }

    override func draw(_ dirtyRect: NSRect) {
        guard let context = NSGraphicsContext.current else { return }
        context.imageInterpolation = .none

        let row = Self.clips[clipIndex].row
        let fromRect = NSRect(
            x: CGFloat(frameIndex) * Self.cell,
            y: CGFloat(Self.sheetRows - row - 1) * Self.cell,
            width: Self.cell,
            height: Self.cell
        )

        context.cgContext.saveGState()
        if facingLeft {
            context.cgContext.translateBy(x: bounds.width, y: 0)
            context.cgContext.scaleBy(x: -1, y: 1)
        }
        Self.sheetImage.draw(
            in: bounds,
            from: fromRect,
            operation: .sourceOver,
            fraction: isAsleep ? 0.6 : 1.0
        )
        context.cgContext.restoreGState()
    }
}
