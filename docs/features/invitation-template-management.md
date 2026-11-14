# Invitation template management

The invitation toolbar offers the current account's four most recently selected templates. Its main action opens the complete catalogue. Creation has two actions: a blank template and a system-default draft. The system draft uses the interface language when available, then English or German. A custom template never acts as the system default.

The editor keeps **Existing templates**, **Template name**, Cancel and Save in its footer. Its header uses the standard document icon. On desktop, metadata, editing columns and footer share equal column widths; the content field grows to the bottom of the email preview. On tablet/mobile the fields stack and the textarea keeps its ordinary writing height. Only its body scrolls. Loading an editable template preserves its ID and name; Save requires an explicit overwrite confirmation. Loading a protected system template starts a new owned copy. Platform admins retain the existing right to edit system text; its kind and language stay locked, and deletion remains unavailable. The preview automatically uses the current Träger's design for scoped admins and the platform design for platform admins. No manual design selector or Träger-catalogue request is needed. Changing Träger branding is a separate settings workflow; template loading does not change the SMTP sender address. The language select controls the email's language.

Deletion requires a confirmation and a permitted custom template. A deleted choice is immediately removed from the invitation composer, even if refreshing the catalogue fails. UserService protects system defaults, foreign ownership and templates used by waiting invitations. Historical delivery snapshots remain unchanged.

## Storybook Admin

The complete flows live under `Organisms/Pages/Links/EmailTemplatesDialog`:

-   `FooterEditor` and `FooterEditorMobile`: footer controls, language select, removed upper chooser and body-scroll geometry.
-   `LoadAndOverwrite`: identity/name loading, confirmation, cancellation and update.
-   `TraegerFooterEditor` and `AgencyFooterEditor`: owned template workflows and automatic scoped branding.
-   `DeleteConfirmation`: cancellation and guarded destructive action.
-   Existing `CreateAndUse`, loading, empty, error and read-only stories remain.

`Organisms/Pages/Links/InviteTemplateQuickPicker` documents recent choices, blank creation, system-default creation and unavailable-default behavior. Storybook mocks show component behavior; backend integration tests and deployed acceptance provide separate evidence.

Recent choices are scoped by token issuer, subject and template kind. They persist across reloads. The existing logout policy clears Admin browser storage, including this history. Removed or invisible templates are filtered out of the menu.

## Other template surfaces in Admin

| Area                        | Owning interface                                    | Why it remains separate                                                                  |
| --------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Consent sentence            | `LegalConsentField`, `DepartmentDataProtectionCard` | Part of the data-protection document; shared picker has string IDs and read-only states. |
| Legal document templates    | `LegalText`, `AgencyLegalTextWithTemplates`         | Versioned platform → Träger → agency adoption and forwarding.                            |
| Case-handover notifications | `CaseHandoverCardView`                              | Per-reason/per-language notification text.                                               |
| Contract forwarding         | `DpaForwardDialog`                                  | Recipient and canonical email preview, rather than invitation-template CRUD.             |
| DPIA defaults               | `dpiaDefaults`, `DpiaTextEditor`                    | Default document drafts.                                                                 |

The generated transactional-mail catalogue is owned by ORISO-Frontend's `src/emails/`. Its mail-layout stories complement the editable-template design in Storybook Admin.
