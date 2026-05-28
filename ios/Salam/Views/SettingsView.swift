import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var state: AppState
    @State private var confirmLogout = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink(destination: LeaveTypesScreen()) { Label("Leave types", systemImage: "tray.full") }
                    NavigationLink(destination: RecipientsScreen()) { Label("Viber recipients", systemImage: "person.2") }
                    NavigationLink(destination: ContractScreen()) { Label("Contract renewal", systemImage: "arrow.clockwise") }
                }
                Section {
                    Button(role: .destructive) { confirmLogout = true } label: {
                        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                } header: {
                    Text("Account")
                } footer: {
                    Text("Sessions last 30 days on this device. Passkey sign-in is coming to the app soon.")
                }
            }
            .navigationTitle("Settings")
            .confirmationDialog("Sign out?", isPresented: $confirmLogout, titleVisibility: .visible) {
                Button("Sign out", role: .destructive) { Task { await state.logout() } }
            } message: { Text("You can sign back in any time.") }
        }
    }
}

// MARK: - Leave types

struct LeaveTypesScreen: View {
    @EnvironmentObject var state: AppState
    @State private var editing: LeaveType?
    @State private var adding = false

    var body: some View {
        List {
            Section {
                ForEach(state.leaveTypes) { lt in
                    Button { editing = lt } label: {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(lt.name).font(.body).foregroundStyle(.primary)
                            Text("\(lt.used) used · \(lt.remaining) left · \(lt.total) total")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .swipeActions {
                        Button(role: .destructive) { delete(lt) } label: { Label("Delete", systemImage: "trash") }
                    }
                }
            } footer: { Text("Deleting a type keeps its past history entries.") }
        }
        .navigationTitle("Leave types")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button { adding = true } label: { Image(systemName: "plus") } } }
        .sheet(item: $editing) { LeaveTypeEditor(existing: $0) }
        .sheet(isPresented: $adding) { LeaveTypeEditor(existing: nil) }
    }

    private func delete(_ lt: LeaveType) {
        Task {
            do { try await API.shared.deleteLeaveType(id: lt.id); await state.refresh(); state.showToast("Leave type deleted.") }
            catch { state.showToast(error.localizedDescription, isError: true) }
        }
    }
}

struct LeaveTypeEditor: View {
    let existing: LeaveType?
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var total = 10
    @State private var saving = false

    var body: some View {
        NavigationStack {
            Form {
                Section { TextField("Name (e.g. Annual, Sick)", text: $name) }
                Section { Stepper("Total days per year: \(total)", value: $total, in: 1...365) }
            }
            .navigationTitle(existing == nil ? "Add leave type" : "Edit leave type")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(existing == nil ? "Add" : "Save") { save() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || saving)
                }
            }
            .onAppear { if let e = existing { name = e.name; total = e.total } }
        }
        .presentationDetents([.medium])
    }

    private func save() {
        saving = true
        let n = name.trimmingCharacters(in: .whitespaces)
        Task {
            do {
                if let e = existing { try await API.shared.updateLeaveType(id: e.id, name: n, total: total, color: e.color ?? "#FF6A3D") }
                else { try await API.shared.addLeaveType(name: n, total: total, color: "#FF6A3D") }
                await state.refresh(); state.showToast(existing == nil ? "Leave type added." : "Leave type updated."); dismiss()
            } catch { state.showToast(error.localizedDescription, isError: true) }
            saving = false
        }
    }
}

// MARK: - Recipients

struct RecipientsScreen: View {
    @EnvironmentObject var state: AppState
    @State private var adding = false

    var body: some View {
        List {
            Section {
                ForEach(state.recipients) { r in
                    HStack(spacing: 12) {
                        Image(systemName: "person.fill").foregroundStyle(.purple)
                            .frame(width: 34, height: 34)
                            .background(Color.purple.opacity(0.14), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                        VStack(alignment: .leading, spacing: 1) {
                            Text(r.name).font(.body)
                            Text(r.phone).font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    .swipeActions { Button(role: .destructive) { delete(r) } label: { Label("Remove", systemImage: "trash") } }
                }
            } header: { Text("Recipients") } footer: {
                Text("After you apply, the app opens Viber with a pre-filled message — one tap to send.")
            }
        }
        .navigationTitle("Viber recipients")
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button { adding = true } label: { Image(systemName: "plus") } } }
        .sheet(isPresented: $adding) { RecipientEditor() }
        .overlay {
            if state.recipients.isEmpty {
                ContentUnavailableView("No contacts yet", systemImage: "person.2",
                    description: Text("Add your manager or HR to notify them via Viber."))
            }
        }
    }

    private func delete(_ r: Recipient) {
        Task {
            do { try await API.shared.deleteRecipient(id: r.id); await state.refresh(); state.showToast("Contact removed.") }
            catch { state.showToast(error.localizedDescription, isError: true) }
        }
    }
}

struct RecipientEditor: View {
    @EnvironmentObject var state: AppState
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var phone = ""
    @State private var saving = false

    var body: some View {
        NavigationStack {
            Form {
                Section { TextField("Name (e.g. Zaha — manager)", text: $name) }
                Section {
                    TextField("+960 …", text: $phone).keyboardType(.phonePad)
                } footer: { Text("Include the country code for the Viber deep-link.") }
            }
            .navigationTitle("Add contact").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") { save() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || phone.trimmingCharacters(in: .whitespaces).isEmpty || saving)
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func save() {
        saving = true
        Task {
            do {
                try await API.shared.addRecipient(name: name.trimmingCharacters(in: .whitespaces), phone: phone.trimmingCharacters(in: .whitespaces))
                await state.refresh(); state.showToast("Contact added."); dismiss()
            } catch { state.showToast(error.localizedDescription, isError: true) }
            saving = false
        }
    }
}

// MARK: - Contract

struct ContractScreen: View {
    @EnvironmentObject var state: AppState
    @State private var enabled = false
    @State private var date = Date()
    @State private var saving = false
    @State private var loaded = false

    var body: some View {
        Form {
            Section {
                Toggle("Auto-reset on renewal", isOn: $enabled)
                if enabled {
                    DatePicker("Renewal date", selection: $date, displayedComponents: .date)
                }
            } footer: {
                Text("On the renewal date, all balances reset to full and the date advances by one year.")
            }
            if enabled, let d = DateUtil.daysFromToday(DateUtil.iso.string(from: date)) {
                Section {
                    Text(d > 0 ? "\(d) days until reset" : d == 0 ? "Resets today." : "\(abs(d)) days overdue")
                        .foregroundStyle(d <= 30 ? .orange : .secondary)
                }
            }
            if let last = state.lastResetDate {
                Section { LabeledContent("Last reset", value: DateUtil.long(last)) }
            }
        }
        .navigationTitle("Contract")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Save") { save() }.disabled(saving) } }
        .onAppear {
            guard !loaded else { return }
            loaded = true
            if let r = state.contractRenewal, let d = DateUtil.parse(r) { date = d; enabled = true }
        }
    }

    private func save() {
        saving = true
        let value = enabled ? DateUtil.iso.string(from: date) : ""
        Task {
            do {
                state.settings = try await API.shared.updateSettings(["contractRenewal": value])
                await state.refresh(); state.showToast("Renewal date saved.")
            } catch { state.showToast(error.localizedDescription, isError: true) }
            saving = false
        }
    }
}
