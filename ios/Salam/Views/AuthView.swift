import SwiftUI

/// Reusable rounded-square brand mark (also used on the onboarding screen).
struct BrandMark: View {
    var symbol: String = "sun.max.fill"
    var size: CGFloat = 66
    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
            .fill(Theme.sunset)
            .frame(width: size, height: size)
            .overlay(
                Image(systemName: symbol)
                    .font(.system(size: size * 0.46, weight: .bold))
                    .foregroundStyle(.white)
            )
            .shadow(color: Color(red: 1, green: 0.42, blue: 0.24).opacity(0.45), radius: 16, y: 6)
    }
}

// Salam "Dusk" login palette — dark, immersive, with a sunset glow.
private enum Dusk {
    static let coral = Color(red: 1.0, green: 0.55, blue: 0.37)
    static let sheetBG = Color(red: 0.094, green: 0.071, blue: 0.122)
    static let danger = Color(red: 1.0, green: 0.46, blue: 0.42)
}

private struct DuskBackdrop: View {
    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.102, green: 0.078, blue: 0.188),
                                    Color(red: 0.149, green: 0.086, blue: 0.149),
                                    Color(red: 0.227, green: 0.125, blue: 0.086)],
                           startPoint: .top, endPoint: .bottom)
            RadialGradient(colors: [Color(red: 1.0, green: 0.478, blue: 0.239).opacity(0.55), .clear],
                           center: UnitPoint(x: 0.5, y: 0.34), startRadius: 0, endRadius: 300)
            RadialGradient(colors: [Color(red: 1.0, green: 0.70, blue: 0.30).opacity(0.22), .clear],
                           center: UnitPoint(x: 0.5, y: 0.36), startRadius: 0, endRadius: 150)
            LinearGradient(colors: [.clear, Color(red: 0.078, green: 0.047, blue: 0.086).opacity(0.9)],
                           startPoint: .center, endPoint: .bottom)
        }
    }
}

private struct DarkField<Content: View>: View {
    let label: String
    var error: String?
    @ViewBuilder var content: Content
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label).font(.footnote).foregroundStyle(.white.opacity(0.7)).padding(.leading, 4)
            content
                .font(.body).foregroundStyle(.white).tint(Dusk.coral)
                .padding(.horizontal, 14).padding(.vertical, 14)
                .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(error == nil ? Color.white.opacity(0.14) : Dusk.danger, lineWidth: 1))
            if let error {
                Text(error).font(.caption).foregroundStyle(Dusk.danger).padding(.leading, 4)
            }
        }
    }
}

struct AuthView: View {
    @State private var startSignup = false
    @State private var showSheet = false

    var body: some View {
        ZStack {
            DuskBackdrop().ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer().frame(height: 72)

                VStack(spacing: 14) {
                    BrandMark(symbol: "sun.max.fill", size: 58)
                    Text("SALAM")
                        .font(.system(size: 42, weight: .black)).tracking(6)
                        .foregroundStyle(.white)
                        .lineLimit(1).minimumScaleFactor(0.6)
                    HStack(spacing: 8) {
                        Rectangle().fill(Dusk.coral.opacity(0.9)).frame(width: 20, height: 2)
                        Text("PERSONAL LEAVE TRACKER")
                            .font(.system(size: 10.5, weight: .bold)).tracking(2.5)
                            .foregroundStyle(Dusk.coral)
                        Rectangle().fill(Dusk.coral.opacity(0.9)).frame(width: 20, height: 2)
                    }
                    .lineLimit(1).minimumScaleFactor(0.6)
                }
                .frame(maxWidth: .infinity).padding(.horizontal, 24)

                Spacer()

                VStack(spacing: 12) {
                    Button { startSignup = false; showSheet = true } label: {
                        Label("Continue with Email", systemImage: "envelope.fill")
                    }
                    .buttonStyle(SunsetButtonStyle())

                    Button("Create account") { startSignup = true; showSheet = true }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Dusk.coral)
                        .frame(maxWidth: .infinity).frame(height: 44)

                    Text("By continuing you agree to the Terms & Privacy Policy.")
                        .font(.caption2).foregroundStyle(.white.opacity(0.5))
                        .multilineTextAlignment(.center).padding(.top, 2)
                }
                .padding(.horizontal, 24).padding(.bottom, 24)
            }
        }
        .sheet(isPresented: $showSheet) {
            EmailAuthSheet(startSignup: startSignup)
        }
        .preferredColorScheme(.dark)
    }
}

private struct EmailAuthSheet: View {
    enum Sub { case signin, signup, forgot }
    @EnvironmentObject var state: AppState
    @State private var sub: Sub
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirm = ""
    @State private var error: String?
    @State private var loading = false
    @State private var sent = false

    init(startSignup: Bool) { _sub = State(initialValue: startSignup ? .signup : .signin) }

    private var title: String {
        switch sub { case .signin: return "Welcome back"; case .signup: return "Create account"; case .forgot: return "Reset password" }
    }
    private var subtitle: String {
        switch sub {
        case .signin: return "Sign in to your leave."
        case .signup: return "Start tracking your leave."
        case .forgot: return "We'll send a reset link if an account exists."
        }
    }

    var body: some View {
        ZStack {
            Dusk.sheetBG.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(title).font(.title2.bold()).foregroundStyle(.white)
                        Text(subtitle).font(.subheadline).foregroundStyle(.white.opacity(0.6))
                    }
                    .padding(.top, 6).padding(.bottom, 4)

                    if sub == .forgot && sent {
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: "checkmark.circle.fill").foregroundStyle(.green).font(.title2)
                            Text("If an account exists for \(email), a reset link is on its way.")
                                .font(.subheadline).foregroundStyle(.white.opacity(0.85))
                        }
                        .padding().background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    } else {
                        if sub == .signup {
                            DarkField(label: "Name (optional)") {
                                TextField("", text: $name, prompt: Text("Your name").foregroundColor(.white.opacity(0.4)))
                                    .textContentType(.name)
                            }
                        }
                        DarkField(label: "Email") {
                            TextField("", text: $email, prompt: Text("you@email.com").foregroundColor(.white.opacity(0.4)))
                                .textContentType(.emailAddress).keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never).autocorrectionDisabled()
                        }
                        if sub != .forgot {
                            DarkField(label: "Password", error: error) {
                                SecureField("", text: $password, prompt: Text(sub == .signup ? "At least 8 characters" : "Your password").foregroundColor(.white.opacity(0.4)))
                                    .textContentType(sub == .signup ? .newPassword : .password)
                            }
                        }
                        if sub == .signup {
                            DarkField(label: "Confirm password", error: error) {
                                SecureField("", text: $confirm, prompt: Text("Repeat password").foregroundColor(.white.opacity(0.4)))
                                    .textContentType(.newPassword)
                            }
                        }
                        if sub == .forgot, let error { Text(error).font(.footnote).foregroundStyle(Dusk.danger) }
                    }

                    if !(sub == .forgot && sent) {
                        Button(action: submit) {
                            if loading { ProgressView().tint(.white) }
                            else { Text(sub == .signin ? "Sign in" : sub == .signup ? "Create account" : "Send reset link") }
                        }
                        .buttonStyle(SunsetButtonStyle()).disabled(loading).padding(.top, 4)
                    }

                    footer
                }
                .padding(24)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .preferredColorScheme(.dark)
    }

    @ViewBuilder private var footer: some View {
        HStack {
            switch sub {
            case .signin:
                Button("Forgot password?") { error = nil; sub = .forgot }
                Spacer()
                HStack(spacing: 4) {
                    Text("New here?").foregroundStyle(.white.opacity(0.6))
                    Button("Create account") { error = nil; sub = .signup }.foregroundStyle(Dusk.coral).fontWeight(.semibold)
                }
            case .signup:
                Spacer()
                HStack(spacing: 4) {
                    Text("Have an account?").foregroundStyle(.white.opacity(0.6))
                    Button("Sign in") { error = nil; sub = .signin }.foregroundStyle(Dusk.coral).fontWeight(.semibold)
                }
                Spacer()
            case .forgot:
                Spacer()
                Button("← Back to sign in") { error = nil; sent = false; sub = .signin }.foregroundStyle(Dusk.coral)
                Spacer()
            }
        }
        .font(.subheadline).padding(.top, 4)
    }

    private func submit() {
        error = nil
        switch sub {
        case .signin:
            guard !email.isEmpty, !password.isEmpty else { error = "Email and password are required."; return }
            loading = true
            Task {
                do { try await state.login(email: email.trimmingCharacters(in: .whitespaces), password: password) }
                catch { self.error = "Invalid email or password." }
                loading = false
            }
        case .signup:
            guard !email.isEmpty, !password.isEmpty else { error = "Email and password are required."; return }
            guard password.count >= 8 else { error = "Password must be at least 8 characters."; return }
            guard password == confirm else { error = "Passwords do not match."; return }
            loading = true
            Task {
                do { try await state.signup(email: email.trimmingCharacters(in: .whitespaces), password: password, name: name.trimmingCharacters(in: .whitespaces)) }
                catch { self.error = error.localizedDescription }
                loading = false
            }
        case .forgot:
            guard !email.isEmpty else { return }
            loading = true
            Task {
                try? await API.shared.forgotPassword(email: email.trimmingCharacters(in: .whitespaces))
                sent = true; loading = false
            }
        }
    }
}
