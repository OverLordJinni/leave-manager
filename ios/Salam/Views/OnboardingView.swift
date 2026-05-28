import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var state: AppState
    @State private var date = Date()
    @State private var enabled = false
    @State private var saving = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 12) {
                BrandMark(symbol: "arrow.clockwise")
                    .padding(.bottom, 8)
                Text("When does your contract renew?")
                    .font(.largeTitle.bold())
                Text("Your balances reset to full on this date, every year.")
                    .font(.body).foregroundStyle(.secondary)
            }
            .padding(.top, 40)

            Toggle("Set a renewal date", isOn: $enabled)
                .padding(.top, 28)
            if enabled {
                DatePicker("Renewal date", selection: $date, displayedComponents: .date)
                    .datePickerStyle(.graphical)
                    .padding(.top, 4)
            }

            Spacer()

            Button(action: { save(skip: false) }) {
                if saving { ProgressView().tint(.white) } else { Text("Continue") }
            }
            .buttonStyle(SunsetButtonStyle()).disabled(saving)

            Button("Skip for now") { save(skip: true) }
                .frame(maxWidth: .infinity).padding(.top, 10).padding(.bottom, 8)
        }
        .padding(.horizontal, 22)
        .frame(maxWidth: 440)
        .frame(maxWidth: .infinity)
        .background(Color(.systemGroupedBackground))
    }

    private func save(skip: Bool) {
        saving = true
        let value = (skip || !enabled) ? "" : DateUtil.iso.string(from: date)
        Task { await state.completeOnboarding(renewal: value); saving = false }
    }
}
