import SwiftUI

/// Message preview + Copy + native Share + one tap-to-open row per recipient.
/// Used by the apply-success flow and by the leave-detail "Notify" sheet.
struct ViberActionsView: View {
    let links: [ViberLink]
    @Environment(\.openURL) private var openURL
    @EnvironmentObject var state: AppState
    @State private var copied = false

    private var message: String { links.first?.messagePreview ?? "" }

    var body: some View {
        if links.isEmpty {
            Text("No Viber recipients yet. Add them in Settings → Viber recipients.")
                .font(.footnote).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding().cardBackground()
        } else {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        SectionLabel(text: "Message")
                        Spacer()
                        Button {
                            UIPasteboard.general.string = message
                            copied = true
                            DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { copied = false }
                        } label: {
                            Label(copied ? "Copied" : "Copy", systemImage: copied ? "checkmark" : "doc.on.doc")
                                .font(.caption.weight(.semibold))
                        }
                        ShareLink(item: message) {
                            Label("Share", systemImage: "square.and.arrow.up").font(.caption.weight(.semibold))
                        }
                    }
                    Text(message)
                        .font(.footnote).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding().cardBackground()
                }

                VStack(alignment: .leading, spacing: 8) {
                    SectionLabel(text: "Open in Viber")
                    VStack(spacing: 0) {
                        ForEach(Array(links.enumerated()), id: \.element.id) { i, lk in
                            if i > 0 { Divider().padding(.leading, 60) }
                            Button { open(lk) } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "message.fill").foregroundStyle(.purple)
                                        .frame(width: 36, height: 36)
                                        .background(Color.purple.opacity(0.14), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(lk.recipientName).font(.body.weight(.semibold)).foregroundStyle(.primary)
                                        Text(lk.phone).font(.footnote).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "arrow.up.right").foregroundStyle(Color.accentColor)
                                }
                                .padding(.vertical, 8).padding(.horizontal, 16)
                            }
                        }
                    }
                    .cardBackground()
                    Text("Tip: if Viber opens to the wrong screen, the message is already copied — paste it, or use Share.")
                        .font(.caption).foregroundStyle(.tertiary).padding(.horizontal, 4)
                }
            }
        }
    }

    private func open(_ lk: ViberLink) {
        UIPasteboard.general.string = message
        guard let url = URL(string: lk.viberUrl) else { return }
        openURL(url) { accepted in
            if !accepted { state.showToast("Couldn't open Viber. Message copied — paste it, or tap Share.", isError: true) }
        }
    }
}

/// Fetches Viber links for a leave entry and shows the actions in a sheet.
struct ViberNotifySheet: View {
    let historyId: String
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var state: AppState
    @State private var links: [ViberLink]?
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                Group {
                    if let links {
                        ViberActionsView(links: links)
                    } else if let error {
                        Text(error).font(.footnote).foregroundStyle(.secondary)
                    } else {
                        ProgressView().padding(40)
                    }
                }
                .padding(16)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Notify via Viber")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .task {
                do { links = try await API.shared.viberLinks(leaveHistoryId: historyId) }
                catch { self.error = error.localizedDescription }
            }
        }
    }
}
