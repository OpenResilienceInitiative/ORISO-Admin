# Platform SMTP UI evidence

The existing `platform-smtp-desktop.png` and `platform-smtp-mobile.png` show the previous deployment-owned read-only proposal. They are **superseded** by the saved Admin Settings rework and must not be used as proof of the current page.

The current `Configured` and `Unavailable` stories exercise editable saved settings, save-before-test behavior and a missing saved-settings snapshot. Story fixtures are local only; they do not send mail or demonstrate deployment or received-mail delivery.

## Current local evidence

-   `saved-admin-smtp-desktop.png`: 1440px viewport, local Configured story after its save acknowledgement and safe-summary refresh.
-   `saved-admin-smtp-mobile.png`: 390px viewport, the same local saved-settings fixture.
-   The new pictures show editable SMTP fields with empty write-only credentials, the saved settings summary and the save-first test note. They are local Storybook evidence, not Dev or received-mail proof.

The Configured browser scenario changes the SMTP host, proves that testing is blocked until the save and summary refresh finish, and checks that the password explanation does not overlap the next field's label. The Unavailable scenario proves that testing stays blocked when the saved settings source cannot be read.
