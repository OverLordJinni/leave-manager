import SwiftUI

struct LeaveDetailView: View {
    let entry: HistoryEntry
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var showNotify = false
    @State private var confirmCancel = false

    private var dateRange: String {
        entry.startDate == entry.endDate
            ? DateUtil.long(entry.startDate)
            : "\(DateUtil.long(entry.startDate)) → \(DateUtil.long(entry.endDate))"
    }

    var body: some View {
        List {
            Section {
                LabeledContent("Type", value: entry.typeName)
                LabeledContent("Duration", value: "\(entry.days) working day\(entry.days > 1 ? "s" : "")")
                LabeledContent("Dates", value: dateRange)
            }
            if entry.cleanReason != nil || entry.urgentTask != nil {
                Section {
                    if let r = entry.cleanReason {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Reason").font(.footnote).foregroundStyle(.secondary)
                            Text(r).font(.body)
                        }.padding(.vertical, 2)
                    }
                    if let u = entry.urgentTask {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("Urgent task / handover").font(.footnote).foregroundStyle(.secondary)
                            Text(u).font(.body)
                        }.padding(.vertical, 2)
                    }
                }
            }
            Section {
                Button { showNotify = true } label: {
                    Label("Notify via Viber", systemImage: "message.fill")
                }
            }
            Section {
                Button(role: .destructive) { confirmCancel = true } label: {
                    Label("Cancel this leave", systemImage: "trash")
                }
            } footer: {
                Text("Cancelling restores \(entry.days) day\(entry.days > 1 ? "s" : "") to \(entry.typeName).")
            }
        }
        .navigationTitle("Leave details")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showNotify) { ViberNotifySheet(historyId: entry.id) }
        .confirmationDialog("Cancel this leave?", isPresented: $confirmCancel, titleVisibility: .visible) {
            Button("Cancel leave", role: .destructive) { cancel() }
        } message: {
            Text("\(entry.typeName) · \(entry.days)d. Your balance will be restored.")
        }
    }

    private func cancel() {
        Task {
            do {
                try await API.shared.cancelLeave(id: entry.id)
                await state.refresh()
                state.showToast("Leave cancelled. Balance restored.")
                dismiss()
            } catch { state.showToast(error.localizedDescription, isError: true) }
        }
    }
}
