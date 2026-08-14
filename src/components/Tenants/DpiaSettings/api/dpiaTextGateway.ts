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
    /**
     * publish=true finalises every section in `texts` that carries content (the editor always
     * sends the complete map, and Publish is a whole-document action, so this applies even to
     * sections not touched in this particular call).
     *
     * publish=false stores a draft. `texts` is still the complete map (loaded + every edit made
     * this session), but publication status is only ever changed for a section whose HTML
     * actually differs from what is currently stored — otherwise a draft save of one chapter
     * would also demote every other already-published chapter that merely rode along in the same
     * map, unedited.
     */
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
                    // Publish is a whole-document action: every section that currently carries
                    // text is finalised, whether or not it was touched in THIS save.
                    if (hasDpiaText(html)) {
                        statusBySection[id] = 'PUBLISHED';
                    } else if (html !== previous.texts[id]) {
                        // Cleared to empty as part of this publish: drop any stale PUBLISHED
                        // status instead of leaving a badge on text that no longer exists.
                        delete statusBySection[id];
                    }
                } else if (html !== previous.texts[id]) {
                    // Draft save: demote only the section(s) whose stored HTML actually changed.
                    // `texts` also carries every OTHER section's current content along for the
                    // ride (see the interface doc) — those must keep their existing status. A
                    // missing entry means DRAFT.
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
