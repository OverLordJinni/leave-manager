import SwiftUI

@main
struct SalamApp: App {
    @StateObject private var state = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(state)
                .tint(.accentColor)
        }
    }
}
