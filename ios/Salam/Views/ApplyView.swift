import SwiftUI

struct ApplyView: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var typeId = ""
    @State private var start = Date()
    @State private var end = Date()
    @State private var reason = ""
    @State private var submitting = false

    // Success state
    @State private var links: [ViberLink]?

    private var selected: LeaveType? { state.leaveTypes.first { $0.id == typeId } }
    private var days: Int { DateUtil.weekdays(from: DateUtil.iso.string(from: start), to: DateUtil.iso.string(from: end)) }
    private var remaining: Int { selected?.remaining ?? 0 }
    private var over: Bool { days > remaining }

    var body: some View {
        NavigationStack {
            Group {
                if let links {
                    ApplySuccessView(type: selected, start: start, end: end, days: days, links: links) {
                        Task { await state.refresh() }
                        state.showToast("Leave submitted.")
                        dismiss()
                    }
                } else {
                    form
                }
            }
            .navigationTitle(links == nil ? "Request leave" : "Submitted")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if links == nil {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                }
            }
        }
        .onAppear { if typeId.isEmpty { typeId = state.leaveTypes.first?.id ?? "" } }
        .presentationDragIndicator(.visible)
    }

    private var form: some View {
        Form {
            Section("Leave type") {
                Picker("Type", selection: $typeId) {
                    ForEach(state.leaveTypes) { Text("\($0.name) — \($0.remaining) left").tag($0.id) }
                }
            }
            Section("Dates") {
                DatePicker("Start", selection: $start, in: Date().addingTimeInterval(-86400)..., displayedComponents: .date)
                    .onChange(of: start) { _, new in if end < new { end = new } }
                DatePicker("End", selection: $end, in: start..., displayedComponents: .date)
                if days > 0 {
                    HStack {
                        Text("\(days) working day\(days > 1 ? "s" : "")")
                            .font(.headline).foregroundStyle(over ? Color.red : Color.accentColor)
                        Spacer()
                        if over { Text("Only \(remaining) left").font(.footnote).foregroundStyle(.red) }
                    }
                }
            }
            Section("Reason (optional)") {
                TextField("Family trip, medical…", text: $reason, axis: .vertical)
            }
        }
        .safeAreaInset(edge: .bottom) {
            Button(action: submit) {
                if submitting { ProgressView().tint(.white) } else { Text("Submit") }
            }
            .buttonStyle(SunsetButtonStyle())
            .disabled(days <= 0 || over || submitting || selected == nil)
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(.bar)
        }
    }

    private func submit() {
        guard let sel = selected, days > 0, !over else { return }
        submitting = true
        Task {
            do {
                let entry = try await API.shared.applyLeave(
                    typeId: sel.id,
                    start: DateUtil.iso.string(from: start),
                    end: DateUtil.iso.string(from: end),
                    reason: reason)
                if state.recipients.isEmpty { links = [] }
                else { links = try await API.shared.viberLinks(leaveHistoryId: entry.id) }
            } catch {
                state.showToast(error.localizedDescription, isError: true)
            }
            submitting = false
        }
    }
}

struct ApplySuccessView: View {
    let type: LeaveType?
    let start: Date
    let end: Date
    let days: Int
    let links: [ViberLink]
    let onDone: () -> Void

    @Environment(\.openURL) private var openURL
    @EnvironmentObject var state: AppState

    private var message: String { links.first?.messagePreview ?? "" }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill").font(.largeTitle).foregroundStyle(.green)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Leave submitted").font(.title3.bold())
                        Text(summaryLine).font(.footnote).foregroundStyle(.secondary)
                    }
                }

                ViberActionsView(links: links)

                Button("Done") { onDone() }
                    .buttonStyle(.bordered).frame(maxWidth: .infinity).controlSize(.large)
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
        .onAppear {
            // Copy + jump to the first recipient's Viber draft, like the web flow.
            if let first = links.first {
                UIPasteboard.general.string = message
                open(first)
            }
        }
    }

    private var summaryLine: String {
        let name = type?.name ?? "Leave"
        var s = "\(name) · \(days) day\(days > 1 ? "s" : "") · " + DateUtil.short(DateUtil.iso.string(from: start))
        if DateUtil.iso.string(from: start) != DateUtil.iso.string(from: end) {
            s += " → " + DateUtil.short(DateUtil.iso.string(from: end))
        }
        return s
    }

    private func open(_ lk: ViberLink) {
        UIPasteboard.general.string = message
        guard let url = URL(string: lk.viberUrl) else { return }
        openURL(url) { accepted in
            if !accepted { state.showToast("Couldn't open Viber. Message copied — paste it manually.", isError: true) }
        }
    }
}
