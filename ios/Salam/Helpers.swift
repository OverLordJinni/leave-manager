import Foundation

enum DateUtil {
    static let iso: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func parse(_ s: String?) -> Date? {
        guard let s else { return nil }
        return iso.date(from: s)
    }

    static func today() -> String { iso.string(from: Date()) }

    /// "1 Jun 2026"
    static func long(_ s: String?) -> String {
        guard let d = parse(s) else { return "" }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_GB")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "d MMM yyyy"
        return f.string(from: d)
    }

    /// "1 Jun"
    static func short(_ s: String?) -> String {
        guard let d = parse(s) else { return "" }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_GB")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "d MMM"
        return f.string(from: d)
    }

    /// Whole days from today (UTC midnight) to the date. Negative = past.
    static func daysFromToday(_ s: String?) -> Int? {
        guard let d = parse(s) else { return nil }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let now = cal.startOfDay(for: iso.date(from: today())!)
        return cal.dateComponents([.day], from: now, to: cal.startOfDay(for: d)).day
    }

    /// Count of Mon–Fri between two yyyy-MM-dd dates, inclusive.
    static func weekdays(from start: String, to end: String) -> Int {
        guard let s = parse(start), let e = parse(end), s <= e else { return 0 }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        var count = 0, cur = s, guardN = 0
        while cur <= e && guardN < 400 {
            let wd = cal.component(.weekday, from: cur) // 1=Sun … 7=Sat
            if wd >= 2 && wd <= 6 { count += 1 }
            cur = cal.date(byAdding: .day, value: 1, to: cur)!
            guardN += 1
        }
        return count
    }
}
