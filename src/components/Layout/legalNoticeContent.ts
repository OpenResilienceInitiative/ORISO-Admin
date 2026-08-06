import { useTranslation } from 'react-i18next';

export const LEGAL_NOTICE_KINDS = ['imprint', 'privacy'] as const;
export type LegalNoticeKind = (typeof LEGAL_NOTICE_KINDS)[number];

export interface LegalNoticeContent {
    title: string;
    /** Plain paragraphs. Kept as text — never dangerouslySetInnerHTML here. */
    paragraphs: string[];
}

/**
 * ============================ WIRING SEAM (#594.15b) ============================
 *
 * The footer's Imprint and Privacy entries used to be dead — antd items with a
 * label and a placeholder key, no handler at all. They now open a dialog, and
 * this hook is the ONLY place that decides what goes into it.
 *
 * Today it returns hardcoded placeholder copy from the translation files, which
 * is explicitly accepted for now ("hardcoded text passt"). The real texts are
 * the tenant's published legal documents — the same ones the DPA reader shows
 * (`Tenants/LegalSettings`, delivered through the public tenant data).
 *
 * To wire them up, replace the body of this hook — nothing else:
 *
 *   const { data } = usePublicTenantData();
 *   const stored = data?.content?.[kind];            // published HTML
 *   return stored ? { title, html: stored } : fallback;
 *
 * ...and render the stored HTML through the shared read-only reader
 * (`DpaLegalReader`) instead of the paragraph list, so a long legal text keeps
 * its chapter navigation. The dialog already sizes for that.
 * ==============================================================================
 */
export const useLegalNoticeContent = (kind: LegalNoticeKind): LegalNoticeContent => {
    const { t } = useTranslation();

    return {
        title: t(`footer.label.${kind}`),
        paragraphs: t(`footer.legal.${kind}.body`).split('\n\n'),
    };
};
