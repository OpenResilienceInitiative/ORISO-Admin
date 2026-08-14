import { DpiaTextMap, hasDpiaText } from '../utils/dpiaSections';
import type { DpiaPublicationStatus } from '../utils/dpiaSections';

/**
 * What the DSFA free-text editor needs from a backend, stated as an interface so the UI can be
 * built, reviewed and story-tested before the endpoint exists.
 *
 * The real implementation will be a thin adapter over an extension of `/tenantadmin/{id}/dpia`
 * (structure introduced in ORISO-TenantService PR#187). This repo deliberately ships only the
 * interface plus an in-memory mock — no backend change belongs in this PR.
 */
export interface DpiaTextDocument {
    /** Operator free texts keyed by section id (see `dpiaSections.ts`). */
    texts: DpiaTextMap;
    /** Publication status per section id; a missing entry means DRAFT. */
    statusBySection: Record<string, DpiaPublicationStatus>;
}

export interface DpiaTextGateway {
    load(tenantId: number): Promise<DpiaTextDocument>;
    /** publish=true finalises the given texts, publish=false stores them as a draft. */
    save(tenantId: number, texts: DpiaTextMap, publish: boolean): Promise<DpiaTextDocument>;
}

/**
 * In-memory gateway for Storybook, tests and local development. It keeps one document per
 * tenant for the lifetime of the page, so switching chapters and saving behaves like the real
 * thing without a server.
 */
export const createMockDpiaTextGateway = (seed: Partial<DpiaTextDocument> = {}): DpiaTextGateway => {
    const store = new Map<number, DpiaTextDocument>();
    const initial: DpiaTextDocument = {
        texts: seed.texts ?? {},
        statusBySection: seed.statusBySection ?? {},
    };

    const read = (tenantId: number) => store.get(tenantId) ?? initial;

    return {
        load: async (tenantId) => read(tenantId),
        save: async (tenantId, texts, publish) => {
            const previous = read(tenantId);
            const statusBySection: Record<string, DpiaPublicationStatus> = { ...previous.statusBySection };
            Object.entries(texts).forEach(([id, html]) => {
                if (publish) {
                    // Publishing finalises exactly the sections that carry text.
                    if (hasDpiaText(html)) {
                        statusBySection[id] = 'PUBLISHED';
                    }
                } else {
                    // A draft save supersedes whatever was published before: a section just
                    // edited and saved as a draft must not keep showing a Published badge over
                    // its now-unpublished replacement. A missing entry means DRAFT.
                    delete statusBySection[id];
                }
            });
            const next: DpiaTextDocument = {
                texts: { ...previous.texts, ...texts },
                statusBySection,
            };
            store.set(tenantId, next);
            return next;
        },
    };
};
