import Foundation

struct LeaveType: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let total: Int
    let used: Int
    let color: String?

    var remaining: Int { max(0, total - used) }
    var fraction: Double { total > 0 ? Double(used) / Double(total) : 0 }
}

struct LeaveTypesResponse: Codable {
    let types: [LeaveType]
    let resetOccurred: Bool?
}

/// GET /api/leave/history returns snake_case rows.
struct HistoryEntry: Codable, Identifiable, Hashable {
    let id: String
    let typeName: String
    let typeColor: String?
    let startDate: String
    let endDate: String
    let days: Int
    let reason: String?
    let leaveTypeId: String?

    enum CodingKeys: String, CodingKey {
        case id
        case typeName = "type_name"
        case typeColor = "type_color"
        case startDate = "start_date"
        case endDate = "end_date"
        case days
        case reason
        case leaveTypeId = "leave_type_id"
    }

    /// The backend smuggles an urgent-task into `reason` with a "\n__UT__:" marker.
    var cleanReason: String? {
        guard let r = reason?.components(separatedBy: "\n__UT__:").first?
            .trimmingCharacters(in: .whitespacesAndNewlines), !r.isEmpty else { return nil }
        return r
    }
    var urgentTask: String? {
        let parts = (reason ?? "").components(separatedBy: "\n__UT__:")
        guard parts.count > 1 else { return nil }
        let u = parts[1].trimmingCharacters(in: .whitespacesAndNewlines)
        return u.isEmpty ? nil : u
    }
}

struct Recipient: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let phone: String
}

struct ViberLink: Codable, Identifiable, Hashable {
    let id: String
    let recipientName: String
    let phone: String
    let viberUrl: String
    let messagePreview: String
}

struct ViberLinksResponse: Codable { let links: [ViberLink] }

/// POST /api/leave/apply returns camelCase; we only need the new id.
struct ApplyResponse: Codable { let id: String }

struct OkResponse: Codable { let ok: Bool? }
