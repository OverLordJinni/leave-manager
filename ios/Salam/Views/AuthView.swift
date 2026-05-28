import SwiftUI

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
            .shadow(color: Color(red: 1, green: 0.42, blue: 0.24).opacity(0.4), radius: 12, y: 5)
    }
}

struct AuthView: View {
    enum Mode { case login, signup, forgot }
    @EnvironmentObject var state: AppState
    @State private var mode: Mode = .login

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                switch mode {
                case .login:  LoginForm(mode: $mode)
                case .signup: SignupForm(mode: $mode)
                case .forgot: ForgotForm(mode: $mode)
                }
            }
            .frame(maxWidth: 440)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 22)
            .padding(.top, 40)
        }
        .background(Color(.systemGroupedBackground))
        .scrollDismissesKeyboard(.interactively)
    }
}

private struct LoginForm: View {
    @EnvironmentObject var state: AppState
    @Binding var mode: AuthView.Mode
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var loading = false

    var body: some View {
        VStack(spacing: 14) {
            VStack(spacing: 7) {
                BrandMark()
                Text("Welcome to Salam").font(.largeTitle.bold())
                Text("Your leave balance, on every device.")
                    .font(.subheadline).foregroundStyle(.secondary)
            }
            .padding(.bottom, 12)

            LabeledField(label: "Email") {
                TextField("you@email.com", text: $email)
                    .textContentType(.emailAddress).keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
            }
            LabeledField(label: "Password", error: error) {
                SecureField("Your password", text: $password)
                    .textContentType(.password)
            }

            Button(action: submit) {
                if loading { ProgressView().tint(.white) } else { Text("Sign in") }
            }
            .buttonStyle(SunsetButtonStyle())
            .disabled(loading)

            HStack {
                Button("Forgot password?") { mode = .forgot }
                Spacer()
                HStack(spacing: 4) {
                    Text("No account?").foregroundStyle(.secondary)
                    Button("Sign up") { mode = .signup }.fontWeight(.semibold)
                }
            }
            .font(.subheadline)
            .padding(.top, 6)
        }
    }

    private func submit() {
        guard !email.isEmpty, !password.isEmpty else { error = "Email and password are required."; return }
        loading = true; error = nil
        Task {
            do { try await state.login(email: email.trimmingCharacters(in: .whitespaces), password: password) }
            catch { self.error = "Invalid email or password." }
            loading = false
        }
    }
}

private struct SignupForm: View {
    @EnvironmentObject var state: AppState
    @Binding var mode: AuthView.Mode
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirm = ""
    @State private var error: String?
    @State private var loading = false

    var body: some View {
        VStack(spacing: 14) {
            VStack(spacing: 7) {
                BrandMark()
                Text("Create your account").font(.largeTitle.bold()).multilineTextAlignment(.center)
                Text("One account, every device. Your data stays yours.")
                    .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
            .padding(.bottom, 12)

            LabeledField(label: "Name (optional)") {
                TextField("Your name", text: $name).textContentType(.name)
            }
            LabeledField(label: "Email") {
                TextField("you@email.com", text: $email)
                    .textContentType(.emailAddress).keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
            }
            LabeledField(label: "Password") {
                SecureField("At least 8 characters", text: $password).textContentType(.newPassword)
            }
            LabeledField(label: "Confirm password", error: error) {
                SecureField("Repeat password", text: $confirm).textContentType(.newPassword)
            }

            Button(action: submit) {
                if loading { ProgressView().tint(.white) } else { Text("Create account") }
            }
            .buttonStyle(SunsetButtonStyle())
            .disabled(loading)

            HStack(spacing: 4) {
                Text("Already have an account?").foregroundStyle(.secondary)
                Button("Sign in") { mode = .login }.fontWeight(.semibold)
            }
            .font(.subheadline).padding(.top, 4)
        }
    }

    private func submit() {
        error = nil
        guard !email.isEmpty, !password.isEmpty else { error = "Email and password are required."; return }
        guard password.count >= 8 else { error = "Password must be at least 8 characters."; return }
        guard password == confirm else { error = "Passwords do not match."; return }
        loading = true
        Task {
            do { try await state.signup(email: email.trimmingCharacters(in: .whitespaces), password: password, name: name.trimmingCharacters(in: .whitespaces)) }
            catch { self.error = error.localizedDescription }
            loading = false
        }
    }
}

private struct ForgotForm: View {
    @EnvironmentObject var state: AppState
    @Binding var mode: AuthView.Mode
    @State private var email = ""
    @State private var sent = false
    @State private var loading = false

    var body: some View {
        VStack(spacing: 14) {
            VStack(spacing: 7) {
                BrandMark(symbol: "envelope.fill")
                Text("Reset password").font(.largeTitle.bold())
                Text("We'll send a reset link if an account exists for that email.")
                    .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
            .padding(.bottom, 12)

            if sent {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.green).font(.title2)
                    Text("If an account exists for \(email), a reset link is on its way.")
                        .font(.subheadline)
                }
                .padding().frame(maxWidth: .infinity, alignment: .leading)
                .cardBackground()
            } else {
                LabeledField(label: "Email") {
                    TextField("you@email.com", text: $email)
                        .textContentType(.emailAddress).keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                }
                Button(action: submit) {
                    if loading { ProgressView().tint(.white) } else { Text("Send reset link") }
                }
                .buttonStyle(SunsetButtonStyle()).disabled(loading)
            }

            Button("← Back to sign in") { mode = .login }
                .font(.subheadline).padding(.top, 4)
        }
    }

    private func submit() {
        guard !email.isEmpty else { return }
        loading = true
        Task {
            try? await API.shared.forgotPassword(email: email.trimmingCharacters(in: .whitespaces))
            sent = true; loading = false
        }
    }
}

/// Label-above-field input matching the web's iOS styling.
struct LabeledField<Content: View>: View {
    let label: String
    var error: String?
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label).font(.footnote).foregroundStyle(.secondary).padding(.leading, 4)
            content
                .font(.body)
                .padding(.horizontal, 14).padding(.vertical, 13)
                .background(Color(.secondarySystemGroupedBackground),
                            in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .strokeBorder(error == nil ? Color(.separator).opacity(0.6) : .red, lineWidth: 1)
                )
            if let error {
                Text(error).font(.caption).foregroundStyle(.red).padding(.leading, 4)
            }
        }
    }
}
