import SwiftUI

struct HomeView: View {
    @EnvironmentObject var state: AppState
    @State private var showApply = false

    private var todayLabel: String {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_GB"); f.dateFormat = "EEEE, d MMMM"
        return f.string(from: Date())
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(todayLabel).font(.subheadline).foregroundStyle(.secondary)

                    if state.justReset {
                        ResetBanner(date: state.contractRenewal) { state.justReset = false }
                    }

                    if !state.leaveTypes.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            SectionLabel(text: "Balances")
                            ForEach(state.leaveTypes) { BalanceCardView(type: $0) }
                        }
                    }

                    Button { showApply = true } label: {
                        Label("Request leave", systemImage: "calendar.badge.plus")
                    }
                    .buttonStyle(SunsetButtonStyle())

                    if let renewal = state.contractRenewal {
                        VStack(alignment: .leading, spacing: 8) {
                            SectionLabel(text: "Auto-reset")
                            HStack(spacing: 13) {
                                IconBadge(symbol: "arrow.clockwise", tint: .secondary)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text("Next reset").font(.body)
                                    Text(DateUtil.long(renewal)).font(.footnote).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(resetLabel(renewal))
                                    .font(.subheadline).foregroundStyle(isUrgent(renewal) ? .orange : .secondary)
                            }
                            .padding(.vertical, 12).padding(.horizontal, 16)
                            .cardBackground()
                        }
                    } else {
                        HStack(spacing: 11) {
                            Image(systemName: "info.circle").foregroundStyle(.secondary)
                            Text("Set a renewal date in Settings → Contract to enable auto-reset.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                        .padding().frame(maxWidth: .infinity, alignment: .leading)
                        .cardBackground()
                    }

                    if !state.history.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            SectionLabel(text: "Recent")
                            VStack(spacing: 0) {
                                ForEach(Array(state.history.prefix(3).enumerated()), id: \.element.id) { i, h in
                                    if i > 0 { Divider().padding(.leading, 60) }
                                    HistoryRowView(entry: h)
                                }
                            }
                            .cardBackground()
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Today")
            .refreshable { await state.refresh() }
        }
        .sheet(isPresented: $showApply) { ApplyView() }
    }

    private func isUrgent(_ s: String) -> Bool {
        if let d = DateUtil.daysFromToday(s) { return d <= 30 }
        return false
    }
    private func resetLabel(_ s: String) -> String {
        guard let d = DateUtil.daysFromToday(s) else { return "" }
        if d > 0 { return "\(d)d away" }
        if d == 0 { return "Today" }
        return "\(abs(d))d overdue"
    }
}

struct BalanceCardView: View {
    let type: LeaveType

    private var tone: Color {
        if type.remaining == 0 { return .red }
        if type.fraction > 0.7 { return .orange }
        return .accentColor
    }
    private var badge: (String, Color) {
        if type.remaining == 0 { return ("Used up", .red) }
        if type.fraction > 0.7 { return ("Running low", .orange) }
        return ("\(type.used) used", .secondary)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(type.name).font(.subheadline.weight(.medium)).foregroundStyle(.secondary)
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text("\(type.remaining)")
                            .font(.system(size: 46, weight: .heavy, design: .rounded))
                            .foregroundStyle(type.remaining == 0 || type.fraction > 0.7 ? tone : .primary)
                        Text("/ \(type.total) days").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Badge(text: badge.0, color: badge.1)
            }
            BalanceBar(fraction: type.fraction, color: tone)
        }
        .padding(18)
        .cardBackground()
    }
}

struct BalanceBar: View {
    let fraction: Double
    let color: Color
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color(.tertiarySystemFill))
                Capsule().fill(color)
                    .frame(width: max(0, min(1, fraction)) * geo.size.width)
            }
        }
        .frame(height: 8)
    }
}

struct ResetBanner: View {
    let date: String?
    let onDismiss: () -> Void
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "sparkles").foregroundStyle(.green).font(.title3)
            VStack(alignment: .leading, spacing: 2) {
                Text("Balances reset for your new contract year.").font(.subheadline.weight(.semibold))
                if let date { Text("Next reset: \(DateUtil.long(date)).").font(.footnote).foregroundStyle(.secondary) }
            }
            Spacer()
            Button { onDismiss() } label: { Image(systemName: "xmark").foregroundStyle(.secondary) }
        }
        .padding()
        .background(Color.green.opacity(0.12), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct IconBadge: View {
    let symbol: String
    var tint: Color = .accentColor
    var bg: Color = Color(.tertiarySystemFill)
    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(tint)
            .frame(width: 32, height: 32)
            .background(bg, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
