import SwiftUI

struct HistoryRowView: View {
    let entry: HistoryEntry
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "calendar")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color.accentColor)
                .frame(width: 36, height: 36)
                .background(Color.accentColor.opacity(0.14), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 8) {
                    Text(entry.typeName).font(.body.weight(.semibold)).lineLimit(1)
                    Badge(text: "\(entry.days)d", color: .secondary)
                }
                Text(dateLine).font(.footnote).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 6)
    }

    private var dateLine: String {
        var s = DateUtil.short(entry.startDate)
        if entry.startDate != entry.endDate { s += " → " + DateUtil.short(entry.endDate) }
        if let r = entry.cleanReason { s += " · " + r }
        return s
    }
}

struct HistoryView: View {
    @EnvironmentObject var state: AppState
    @State private var filter = "all"
    @State private var pendingCancel: HistoryEntry?
    @State private var canceling = false

    private var filtered: [HistoryEntry] {
        filter == "all" ? state.history : state.history.filter { $0.leaveTypeId == filter }
    }

    var body: some View {
        NavigationStack {
            Group {
                if state.history.isEmpty {
                    ContentUnavailableView("No leave history yet",
                        systemImage: "clock",
                        description: Text("Request your first leave to see it here."))
                } else {
                    List {
                        Section("This period") {
                            ForEach(state.leaveTypes) { lt in
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack {
                                        Text(lt.name).font(.subheadline)
                                        Spacer()
                                        Text("\(lt.used) / \(lt.total)d").font(.subheadline).foregroundStyle(.secondary)
                                    }
                                    BalanceBar(fraction: lt.fraction, color: .accentColor)
                                }
                                .padding(.vertical, 4)
                            }
                        }

                        Section {
                            ForEach(filtered) { entry in
                                NavigationLink(destination: LeaveDetailView(entry: entry)) {
                                    HistoryRowView(entry: entry)
                                }
                                .swipeActions(edge: .trailing) {
                                    Button(role: .destructive) { pendingCancel = entry } label: {
                                        Label("Cancel", systemImage: "trash")
                                    }
                                }
                            }
                        } footer: {
                            Text("Tap a leave to see full details. Swipe to cancel and restore the balance.")
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("History")
            .toolbar {
                if state.leaveTypes.count > 1 {
                    ToolbarItem(placement: .topBarTrailing) {
                        Menu {
                            Picker("Filter", selection: $filter) {
                                Text("All types").tag("all")
                                ForEach(state.leaveTypes) { Text($0.name).tag($0.id) }
                            }
                        } label: { Image(systemName: "line.3.horizontal.decrease.circle") }
                    }
                }
            }
            .refreshable { await state.refresh() }
            .confirmationDialog("Cancel this leave?",
                isPresented: Binding(get: { pendingCancel != nil }, set: { if !$0 { pendingCancel = nil } }),
                titleVisibility: .visible, presenting: pendingCancel) { entry in
                Button("Cancel leave", role: .destructive) { cancel(entry) }
            } message: { entry in
                Text("\(entry.typeName) · \(entry.days)d. Your balance will be restored.")
            }
        }
    }

    private func cancel(_ entry: HistoryEntry) {
        canceling = true
        Task {
            do { try await API.shared.cancelLeave(id: entry.id); await state.refresh(); state.showToast("Leave cancelled. Balance restored.") }
            catch { state.showToast(error.localizedDescription, isError: true) }
            pendingCancel = nil; canceling = false
        }
    }
}
