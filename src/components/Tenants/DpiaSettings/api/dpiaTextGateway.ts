import { DpiaTextMap } from '../utils/dpiaSections';
import type { DpiaPublicationStatus } from '../components/DpiaTextEditor';

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
            const next: DpiaTextDocument = {
                texts: { ...previous.texts, ...texts },
                statusBySection: publish
                    ? {
                          ...previous.statusBySection,
                          // Publishing finalises exactly the sections that carry text.
                          ...Object.fromEntries(
                              Object.entries(texts)
                                  .filter(([, html]) => html.trim() !== '' && html.trim() !== '<p></p>')
                                  .map(([id]) => [id, 'PUBLISHED' as DpiaPublicationStatus]),
                          ),
                      }
                    : previous.statusBySection,
            };
            store.set(tenantId, next);
            return next;
        },
    };
};
