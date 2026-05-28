import SwiftUI

extension Color {
    /// Hex string like "#FF6A3D" → Color. Falls back to the app accent on failure.
    init(hex: String?) {
        guard let hex, let v = UInt64(hex.trimmingCharacters(in: CharacterSet(charactersIn: "#")), radix: 16),
              hex.count >= 6 else { self = .accentColor; return }
        let r = Double((v & 0xFF0000) >> 16) / 255.0
        let g = Double((v & 0x00FF00) >> 8) / 255.0
        let b = Double(v & 0x0000FF) / 255.0
        self = Color(red: r, green: g, blue: b)
    }
}

enum Theme {
    /// Sunset gradient used on the primary call-to-action.
    static let sunset = LinearGradient(
        colors: [Color(red: 1.0, green: 0.416, blue: 0.239), Color(red: 1.0, green: 0.65, blue: 0.239)],
        startPoint: .leading, endPoint: .trailing
    )
}

/// Filled, gradient primary button — the iOS-native equivalent of the web's CTA.
struct SunsetButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(Theme.sunset, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

extension View {
    func cardBackground() -> some View {
        self.background(Color(.secondarySystemGroupedBackground),
                        in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
