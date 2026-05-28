import SwiftUI

struct RootView: View {
    @EnvironmentObject var state: AppState

    var body: some View {
        ZStack {
            switch state.phase {
            case .loading:
                ProgressView().controlSize(.large)
            case .auth:
                AuthView()
            case .onboarding:
                OnboardingView()
            case .ready:
                MainTabView()
            }
        }
        .animation(.easeInOut, value: state.phase)
        .task { if state.phase == .loading { await state.restore() } }
        .overlay(alignment: .bottom) {
            if let t = state.toast {
                ToastView(toast: t)
                    .padding(.bottom, 90)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.3), value: state.toast)
    }
}

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "house.fill") }
            HistoryView()
                .tabItem { Label("History", systemImage: "clock.fill") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
        }
    }
}

struct ToastView: View {
    let toast: Toast
    var body: some View {
        Text(toast.message)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(toast.isError ? .white : Color(.systemBackground))
            .padding(.horizontal, 18)
            .padding(.vertical, 11)
            .background(toast.isError ? Color.red : Color.primary,
                        in: Capsule())
            .shadow(color: .black.opacity(0.2), radius: 12, y: 4)
            .padding(.horizontal, 24)
    }
}

// MARK: - Shared bits

/// Section header text matching iOS grouped-list style.
struct SectionLabel: View {
    let text: String
    var body: some View {
        Text(text.uppercased())
            .font(.footnote)
            .foregroundStyle(.secondary)
    }
}

/// A coral pill badge.
struct Badge: View {
    let text: String
    var color: Color = .accentColor
    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 9).padding(.vertical, 3)
            .background(color.opacity(0.14), in: Capsule())
    }
}
