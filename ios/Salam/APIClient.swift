import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case server(String)
    case network

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "Your session has expired. Please sign in again."
        case .server(let m): return m
        case .network: return "Can't reach the server. Check your connection."
        }
    }
}

/// Thin async wrapper over the Salam REST API.
/// Session auth is cookie-based (lm_session); URLSession's shared cookie storage
/// persists it across launches, exactly like a browser.
final class API {
    static let shared = API()

    // Point at the live deployment. (Swap for a local/preview URL during dev.)
    static let baseURL = "https://salam.kalhujinni.com"

    private let session: URLSession

    private init() {
        let cfg = URLSessionConfiguration.default
        cfg.httpCookieStorage = .shared
        cfg.httpCookieAcceptPolicy = .always
        cfg.httpShouldSetCookies = true
        cfg.requestCachePolicy = .reloadIgnoringLocalCacheData
        cfg.timeoutIntervalForRequest = 20
        session = URLSession(configuration: cfg)
    }

    // MARK: - Core

    @discardableResult
    private func data(_ path: String, method: String = "GET", json: [String: Any]? = nil) async throws -> Data {
        guard let url = URL(string: API.baseURL + path) else { throw APIError.network }
        var req = URLRequest(url: url)
        req.httpMethod = method
        if let json {
            req.httpBody = try JSONSerialization.data(withJSONObject: json)
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let respData: Data, response: URLResponse
        do {
            (respData, response) = try await session.data(for: req)
        } catch {
            throw APIError.network
        }
        guard let http = response as? HTTPURLResponse else { throw APIError.network }
        if http.statusCode == 401 { throw APIError.unauthorized }
        guard (200..<300).contains(http.statusCode) else {
            let msg = (try? JSONDecoder().decode([String: String].self, from: respData))?["error"]
                ?? "Request failed (\(http.statusCode))"
            throw APIError.server(msg)
        }
        return respData
    }

    private func decode<T: Decodable>(_ type: T.Type, _ path: String, method: String = "GET", json: [String: Any]? = nil) async throws -> T {
        let d = try await data(path, method: method, json: json)
        return try JSONDecoder().decode(T.self, from: d)
    }

    // MARK: - Auth

    func me() async -> Bool {
        do { _ = try await data("/api/auth/me"); return true }
        catch { return false }
    }
    func login(email: String, password: String) async throws {
        _ = try await data("/api/auth/login", method: "POST", json: ["email": email, "password": password])
    }
    func signup(email: String, password: String, name: String) async throws {
        _ = try await data("/api/auth/signup", method: "POST", json: ["email": email, "password": password, "name": name])
    }
    func forgotPassword(email: String) async throws {
        _ = try await data("/api/auth/forgot-password", method: "POST", json: ["email": email])
    }
    func logout() async throws {
        _ = try await data("/api/auth/logout", method: "POST")
    }

    // MARK: - Leave

    func leaveTypes() async throws -> LeaveTypesResponse {
        try await decode(LeaveTypesResponse.self, "/api/leave/types")
    }
    func history() async throws -> [HistoryEntry] {
        try await decode([HistoryEntry].self, "/api/leave/history")
    }
    func addLeaveType(name: String, total: Int, color: String) async throws {
        _ = try await data("/api/leave/types", method: "POST", json: ["name": name, "total": total, "color": color])
    }
    func updateLeaveType(id: String, name: String, total: Int, color: String) async throws {
        _ = try await data("/api/leave/types/\(id)", method: "PUT", json: ["name": name, "total": total, "color": color])
    }
    func deleteLeaveType(id: String) async throws {
        _ = try await data("/api/leave/types/\(id)", method: "DELETE")
    }
    func applyLeave(typeId: String, start: String, end: String, reason: String) async throws -> ApplyResponse {
        try await decode(ApplyResponse.self, "/api/leave/apply", method: "POST",
                         json: ["leaveTypeId": typeId, "startDate": start, "endDate": end, "reason": reason])
    }
    func cancelLeave(id: String) async throws {
        _ = try await data("/api/leave/history/\(id)", method: "DELETE")
    }

    // MARK: - Settings

    func settings() async throws -> [String: String] {
        try await decode([String: String].self, "/api/settings")
    }
    func updateSettings(_ values: [String: String]) async throws -> [String: String] {
        try await decode([String: String].self, "/api/settings", method: "PUT", json: values)
    }

    // MARK: - Recipients & Viber

    func recipients() async throws -> [Recipient] {
        try await decode([Recipient].self, "/api/recipients")
    }
    func addRecipient(name: String, phone: String) async throws {
        _ = try await data("/api/recipients", method: "POST", json: ["name": name, "phone": phone])
    }
    func deleteRecipient(id: String) async throws {
        _ = try await data("/api/recipients/\(id)", method: "DELETE")
    }
    func viberLinks(leaveHistoryId: String) async throws -> [ViberLink] {
        try await decode(ViberLinksResponse.self, "/api/viber/links", method: "POST",
                         json: ["leaveHistoryId": leaveHistoryId]).links
    }
}
