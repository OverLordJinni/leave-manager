import SwiftUI

enum Phase { case loading, auth, onboarding, ready }

struct Toast: Identifiable, Equatable {
    let id = UUID()
    let message: String
    let isError: Bool
}

@MainActor
final class AppState: ObservableObject {
    @Published var phase: Phase = .loading
    @Published var leaveTypes: [LeaveType] = []
    @Published var history: [HistoryEntry] = []
    @Published var recipients: [Recipient] = []
    @Published var settings: [String: String] = [:]
    @Published var justReset = false
    @Published var toast: Toast?

    private let api = API.shared

    var contractRenewal: String? {
        let v = settings["contractRenewal"] ?? ""
        return v.isEmpty ? nil : v
    }
    var lastResetDate: String? {
        let v = settings["lastResetDate"] ?? ""
        return v.isEmpty ? nil : v
    }

    // MARK: - Toast

    func showToast(_ message: String, isError: Bool = false) {
        let t = Toast(message: message, isError: isError)
        toast = t
        Task {
            try? await Task.sleep(nanoseconds: 2_400_000_000)
            if toast == t { toast = nil }
        }
    }

    // MARK: - Session

    func restore() async {
        if await api.me() {
            await loadAll(initial: true)
        } else {
            phase = .auth
        }
    }

    func loadAll(initial: Bool = false) async {
        do {
            async let typesT = api.leaveTypes()
            async let histT = api.history()
            async let recsT = api.recipients()
            async let settT = api.settings()
            let (types, hist, recs, sett) = try await (typesT, histT, recsT, settT)
            leaveTypes = types.types
            if types.resetOccurred == true { justReset = true }
            history = hist
            recipients = recs
            settings = sett
            phase = (sett["onboarded"] == "true") ? .ready : .onboarding
        } catch APIError.unauthorized {
            phase = .auth
        } catch {
            if initial { phase = .auth }
            showToast(error.localizedDescription, isError: true)
        }
    }

    // MARK: - Auth actions

    func login(email: String, password: String) async throws {
        try await api.login(email: email, password: password)
        await loadAll()
    }
    func signup(email: String, password: String, name: String) async throws {
        try await api.signup(email: email, password: password, name: name)
        await loadAll()
    }
    func logout() async {
        try? await api.logout()
        leaveTypes = []; history = []; recipients = []; settings = [:]
        phase = .auth
    }
    func completeOnboarding(renewal: String) async {
        do {
            settings = try await api.updateSettings(["onboarded": "true", "contractRenewal": renewal])
            await loadAll()
        } catch {
            showToast(error.localizedDescription, isError: true)
        }
    }

    // MARK: - Mutations (refresh after)

    func refresh() async { await loadAll() }
}
