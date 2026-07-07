// swift-tools-version: 5.9
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
    ]
)
