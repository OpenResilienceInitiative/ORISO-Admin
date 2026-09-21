// eslint-disable-next-line import/no-extraneous-dependencies -- Storybook-only MSW fixture
import { http, HttpResponse } from 'msw';

export const PUBLIC_DPA_MAIL_PREVIEW_ENDPOINT = '*/service/users/account-invites/:token/onboarding/dpa-mail-preview';
export const ADMIN_DPA_MAIL_PREVIEW_ENDPOINT = '*/service/useradmin/dpa-invites/preview';

/**
 * Deterministic output of CTS PR #147's
 * `DpaSigningEmailService.preview` (PR #147, commit
 * `a235689df004ffdb97ce7df5e8f59860fedf50b0`, lines 62 and 122-144) for:
 *
 * - tenant: Musterträger Nord
 * - link: https://app.oriso-dev.site/dpa-sign/storybook-sample-token
 * - expiry: 2026-09-30T23:59
 *
 * Keep this as a renderer snapshot. Reusing Admin's generic branded-email story
 * helper would add a footer that this canonical DPA mail does not send.
 */
const document = {
    subject: 'ORISO: Vertragsunterlagen für Musterträger Nord',
    html: '<!doctype html><html lang="de"><body style="margin:0;padding:0;background:#f3f2f2;font-family:Arial,sans-serif;color:#202020;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #cbc8c8;border-radius:12px;overflow:hidden;"><tr><td style="padding:20px 28px;background:#e7e5e5;color:#4a0000;font-size:20px;font-weight:700;">ORISO</td></tr><tr><td style="padding:30px 28px 10px;font-size:24px;line-height:32px;font-weight:700;">Vertragsunterlagen</td></tr><tr><td style="padding:0 28px 16px;font-size:16px;line-height:25px;">Für <strong>Musterträger Nord</strong> wurden Vertragsunterlagen zur Nutzung der Online-Beratungsplattform bereitgestellt. Über den folgenden Link können Sie die Unterlagen vollständig lesen und verbindlich bestätigen.</td></tr><tr><td style="padding:4px 28px 22px;"><a href="https://app.oriso-dev.site/dpa-sign/storybook-sample-token" style="display:inline-block;background:#b90013;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:24px;font-weight:700;">Unterlagen ansehen und bestätigen</a></td></tr><tr><td style="padding:0 28px 12px;color:#5f5c5c;font-size:14px;line-height:22px;">Die Unterlagen können bis zur Bestätigung oder bis zum Ablauf des Links erneut geöffnet werden. Die Bestätigung kann nur einmal abgegeben werden. Der Link ist gültig bis 30.09.2026, 23:59 Uhr.</td></tr><tr><td style="padding:0 28px 28px;color:#5f5c5c;font-size:13px;line-height:20px;word-break:break-all;">Falls die Schaltfläche nicht funktioniert: <a href="https://app.oriso-dev.site/dpa-sign/storybook-sample-token">https://app.oriso-dev.site/dpa-sign/storybook-sample-token</a></td></tr></table></td></tr></table></body></html>',
};

export const dpaMailPreviewStoryHandlers = [
    http.get(PUBLIC_DPA_MAIL_PREVIEW_ENDPOINT, () => HttpResponse.json(document)),
    http.post(ADMIN_DPA_MAIL_PREVIEW_ENDPOINT, () => HttpResponse.json(document)),
];
