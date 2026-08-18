import { EditorVersion } from '../../../FormPluginEditor/M3RichTextEditor';
import { LegalTextVersion } from '../../../../types/legalVersion';
import { parseLegalContentMap } from './legalContentLanguages';

/**
 * Maps the generic legal-text history onto the editor's version look-back
 * (ADR-021 decision 3). The mapping is the one the AVV card already performs
 * inline — extracted here because three more cards need exactly the same:
 *
 * - the id is the version's surrogate id (ORISO-AgencyService#256), and the
 *   publication timestamp travels beside it, because the editor formats date
 *   ranges from a date and a surrogate id is not one,
 * - the shown content is the ACTIVE language of that version, falling back to
 *   its first stored language so a look-back never shows an empty page,
 * - `restorable` is false for such a fallback: "adopt as new draft" would
 *   otherwise copy a foreign language into the language being edited.
 */
export const formatLegalVersionLabel = (publishedAt: string, locale: string): string => {
    const date = new Date(publishedAt);
    return Number.isNaN(date.getTime())
        ? publishedAt
        : date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
};

export const toEditorVersions = (
    versions: LegalTextVersion[],
    activeLanguage: string,
    locale: string,
    /** Suffix for the newest entry, e.g. "(current)". */
    currentSuffix?: string,
): EditorVersion[] =>
    versions.map((version, index) => {
        const contentMap = parseLegalContentMap(version.content);
        const dateLabel = formatLegalVersionLabel(version.publishedAt, locale);
        return {
            id: String(version.id),
            publishedAt: version.publishedAt,
            label: index === 0 && currentSuffix ? `${dateLabel} ${currentSuffix}` : dateLabel,
            content: contentMap[activeLanguage] ?? Object.values(contentMap)[0] ?? '',
            restorable: Object.prototype.hasOwnProperty.call(contentMap, activeLanguage),
        };
    });
