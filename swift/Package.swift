// swift-tools-version: 6.3
import PackageDescription

let package = Package(
    name: "open-minion",
    platforms: [
        .macOS(.v14)
    ],
    targets: [
        .executableTarget(
            name: "open-minion",
            path: "Sources/open-minion",
            resources: [
                .copy("Resources/ChickBlue.png")
            ]
        ),
    ],
    swiftLanguageModes: [.v6]
)
