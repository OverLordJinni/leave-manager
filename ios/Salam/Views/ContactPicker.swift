import SwiftUI
import ContactsUI
import Contacts

/// Wraps the system contact picker. No Contacts permission is required — the
/// picker runs out-of-process and returns only the contact the user taps.
struct ContactPicker: UIViewControllerRepresentable {
    var onPick: (_ name: String, _ phone: String) -> Void
    var onCancel: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onPick: onPick, onCancel: onCancel) }

    func makeUIViewController(context: Context) -> CNContactPickerViewController {
        let picker = CNContactPickerViewController()
        picker.displayedPropertyKeys = [CNContactPhoneNumbersKey]
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ vc: CNContactPickerViewController, context: Context) {}

    final class Coordinator: NSObject, CNContactPickerDelegate {
        let onPick: (String, String) -> Void
        let onCancel: () -> Void
        init(onPick: @escaping (String, String) -> Void, onCancel: @escaping () -> Void) {
            self.onPick = onPick; self.onCancel = onCancel
        }
        func contactPicker(_ picker: CNContactPickerViewController, didSelect contact: CNContact) {
            let name = CNContactFormatter.string(from: contact, style: .fullName) ?? ""
            let phone = contact.phoneNumbers.first?.value.stringValue ?? ""
            onPick(name, phone)
        }
        func contactPickerDidCancel(_ picker: CNContactPickerViewController) { onCancel() }
    }
}
