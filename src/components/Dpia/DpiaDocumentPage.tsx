/** DPIA shell and verified overview; optional chapter components are mounted in document order. */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { dpiaValue } from './DpiaChapterShared';
import { toDpiaKeyFigures } from './dpiaMasterDataDisplay';
import { DpiaPresetSwitch } from './DpiaPresetSwitch';
import { DpiaChapter5 } from './DpiaChapter5';
import { DpiaIcon } from './DpiaIcon';
import { ADDITIONAL_CHAPTER_IDS } from './DpiaChapters';
import type { DpiaChapterComponents, AdditionalChapterId } from './DpiaChapters';
import { DpiaEvidenceProvider } from './DpiaEvidenceDialog';
import type { DpiaMasterData } from '../../types/dpiaMasterData';
import {
    CHAPTERS,
    INHERITANCE_STEPS,
    MATRIX_COLUMNS,
    MATRIX_ROWS,
    NORMS,
    PRESET_LABELS,
    ROLE_TIERS,
} from './dpiaContent';
import type { CompliancePreset, KeyFigure, MatrixCell, NormCitation } from './dpiaContent';
import styles from './styles.module.scss';

/** Navigation follows the overview plus actual optional chapter slots. */
const OVERVIEW_CHAPTER_IDS = new Set(['kap3', 'kap4', 'kap5']);

const TIER_CLASS: Record<number, string> = {
    1: '',
    2: styles.roleTier2,
    3: styles.roleTier3,
    4: styles.roleTier4,
};

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' ');

/** Norm citation that follows the active compliance preset. */
const Norm = ({ citation, preset }: { citation: NormCitation; preset: CompliancePreset }) => (
    <span className={styles.norm}>{citation[preset]}</span>
);

const MatrixValue = ({ cell }: { cell: MatrixCell }) => {
    switch (cell.kind) {
        case 'yes':
            return (
                <td className={styles.cellYes}>
                    <span aria-hidden="true">✓</span>
                    <span className={styles.srOnly}>ja</span>
                </td>
            );
        case 'no':
            return (
                <td className={styles.cellNo}>
                    <span aria-hidden="true">–</span>
                    <span className={styles.srOnly}>nein</span>
                </td>
            );
        case 'e2ee':
            return (
                <td className={styles.cellE2ee}>
                    <span>
                        <DpiaIcon name="lock" size="12px" />
                        technisch ausgeschlossen (E2EE)
                    </span>
                </td>
            );
        default:
            return <td className={styles.cellText}>{cell.text}</td>;
    }
};

export interface DpiaDocumentPageProps {
    /** Operator name; in production resolved per tenant from the global settings. */
    operatorName?: string;
    documentVersion?: string;
    documentDate?: string;
    /** Document status, shown as a pill next to the preset switch. */
    statusLabel?: string;
    nextReviewDate?: string;
    /** Compliance preset to start with. The switch stays interactive. */
    initialPreset?: CompliancePreset;
    /** Whether the ochre internal annotations start visible. */
    initialShowInternalNotes?: boolean;
    /** Explicit preview figures; public documents resolve the typed master-data record. */
    keyFigures?: KeyFigure[];
    /** Verified chapter content, rendered below the overview sections. */
    children?: ReactNode;
    /** Typed operator data. The public container supplies it; this component remains reusable for previews. */
    masterData?: DpiaMasterData | null;
    /** Mounted chapter slots; omitted slots never become navigation links. */
    chapters?: DpiaChapterComponents;
}

export const DpiaDocumentPage = ({
    operatorName,
    documentVersion = '0.1-draft',
    documentDate,
    statusLabel = 'Entwurf',
    nextReviewDate,
    initialPreset = 'kdg',
    initialShowInternalNotes = false,
    keyFigures,
    children,
    masterData,
    chapters = {},
}: DpiaDocumentPageProps) => {
    const resolvedOperatorName = dpiaValue(
        operatorName || masterData?.operator?.shortName?.trim() || masterData?.operator?.legalName,
    );
    const resolvedDocumentDate = dpiaValue(documentDate || masterData?.document?.documentDate);
    const resolvedReviewDate = dpiaValue(nextReviewDate || masterData?.document?.nextReviewDate);
    const resolvedKeyFigures = keyFigures ?? toDpiaKeyFigures(masterData);
    const [preset, setPreset] = useState<CompliancePreset>(initialPreset);
    const [showInternalNotes, setShowInternalNotes] = useState(initialShowInternalNotes);
    const pageRef = useRef<HTMLDivElement>(null);
    const appbarRef = useRef<HTMLElement>(null);
    const chapterNavRef = useRef<HTMLElement>(null);

    // .chapterNav's sticky offset, and every .section's scroll-margin-top, must equal the app
    // bar's and nav's ACTUAL rendered heights, not fixed guesses: .appbar has `flex-wrap: wrap`,
    // and a long operatorName (translated labels, a narrower-than-authored viewport) can push it
    // to wrap onto a second line even above the 1024px breakpoint that drops both to non-sticky.
    // Measuring instead of guessing means the chapter nav — and a chapter's own heading, when
    // jumped to via an anchor — can never end up covered, regardless of why the app bar grew.
    useEffect(() => {
        const appbar = appbarRef.current;
        const chapterNav = chapterNavRef.current;
        const page = pageRef.current;
        if (!appbar || !chapterNav || !page) return undefined;

        const updateHeights = () => {
            page.style.setProperty('--dpia-appbar-height', `${appbar.offsetHeight}px`);
            page.style.setProperty('--dpia-chapternav-height', `${chapterNav.offsetHeight}px`);
        };
        updateHeights();

        const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateHeights) : undefined;
        resizeObserver?.observe(appbar);
        resizeObserver?.observe(chapterNav);
        window.addEventListener('resize', updateHeights);

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', updateHeights);
        };
    }, []);

    return (
        <DpiaEvidenceProvider>
            <div className={styles.page} ref={pageRef}>
                <header className={styles.appbar} ref={appbarRef}>
                    <div className={styles.brand}>
                        <span className={styles.logoSlot} aria-hidden="true">
                            Logo
                        </span>
                        <div>
                            <div className={styles.brandTitle}>Datenschutz-Folgenabschätzung</div>
                            <div className={styles.brandSub}>
                                {resolvedOperatorName} · <code>/docs/dsfa/latest/</code>
                            </div>
                        </div>
                    </div>

                    <div className={styles.tools}>
                        <DpiaPresetSwitch preset={preset} onChange={setPreset} />
                        <span className={styles.statusPill}>{statusLabel}</span>
                        <span className={styles.version}>
                            v{documentVersion} · {resolvedDocumentDate}
                        </span>
                        <button
                            type="button"
                            className={styles.notesToggle}
                            aria-pressed={showInternalNotes}
                            onClick={() => setShowInternalNotes((on) => !on)}
                        >
                            <span className={cx(styles.knob, showInternalNotes && styles.knobOn)} aria-hidden="true" />
                            Interne Anmerkungen
                        </button>
                    </div>
                </header>

                <div className={styles.hero}>
                    <div className={styles.heroCard}>
                        <div className={styles.kicker}>Datenschutz-Folgenabschätzung · {PRESET_LABELS[preset]}</div>
                        <h1>DSFA zur Online-Beratungsplattform ORISO</h1>
                        <p className={styles.lede}>
                            Dieses Dokument beschreibt die Verarbeitung personenbezogener Daten durch den
                            Plattformbetreiber. Es wird mit jeder Release-Version fortgeschrieben; jede Aussage ist auf
                            Code, Konfiguration oder ADR zurückführbar.
                        </p>
                        <div className={styles.facts}>
                            <span className={styles.fact}>
                                <DpiaIcon name="live-chats" size="15px" />
                                Browserbasiert, ohne Installation
                            </span>
                            <span className={styles.fact}>
                                <DpiaIcon name="person-circle" size="15px" />
                                Anonyme Nutzung möglich
                            </span>
                            <span className={styles.fact}>
                                <DpiaIcon name="lock" size="15px" />
                                Beratungsinhalte Ende-zu-Ende-verschlüsselt
                            </span>
                            <span className={cx(styles.fact, styles.factReview)}>
                                Nächste Überprüfung {resolvedReviewDate}
                            </span>
                        </div>
                    </div>
                </div>

                <nav className={styles.chapterNav} aria-label="Kapitel" ref={chapterNavRef}>
                    <div className={styles.chapterNavInner}>
                        {CHAPTERS.map((chapter, index) =>
                            OVERVIEW_CHAPTER_IDS.has(chapter.id) || chapters[chapter.id as AdditionalChapterId] ? (
                                <a key={chapter.id} href={`#${chapter.id}`} className={styles.chip}>
                                    {index + 1} {chapter.label}
                                </a>
                            ) : (
                                <span
                                    key={chapter.id}
                                    className={cx(styles.chip, styles.chipDisabled)}
                                    aria-disabled="true"
                                    title="Kapitel noch nicht in dieser Ansicht verfügbar"
                                >
                                    {index + 1} {chapter.label}
                                </span>
                            ),
                        )}
                    </div>
                </nav>

                <main className={styles.body}>
                    {ADDITIONAL_CHAPTER_IDS.slice(0, 2).map((id) => {
                        const Chapter = chapters[id];
                        return Chapter ? (
                            <Chapter
                                key={id}
                                preset={preset}
                                showInternalNotes={showInternalNotes}
                                onPresetChange={setPreset}
                                masterData={masterData}
                            />
                        ) : null;
                    })}
                    <section className={styles.section} id="kap3" aria-labelledby="kap3-title">
                        <span className={styles.chapterNo}>Kapitel 3</span>
                        <h2 id="kap3-title">Kontext und Kennzahlen</h2>
                        <p>
                            Die Plattform verbindet Online- und Vor-Ort-Beratung. Der Zugang ist browserbasiert; das
                            Leistungsspektrum umfasst Nachrichten und Dateien, Sprachnachrichten, Gruppenchats,
                            Video-Beratung und einen anonymen Live-Einzelchat.
                        </p>
                        <div className={styles.figures}>
                            {resolvedKeyFigures.map((figure) => (
                                <div key={figure.label} className={styles.figure}>
                                    <div className={styles.figureValue}>{figure.value}</div>
                                    <div className={styles.figureLabel}>{figure.label}</div>
                                    {figure.asOfDate && <div className={styles.footnote}>Stand: {figure.asOfDate}</div>}
                                </div>
                            ))}
                        </div>
                        <p className={styles.footnote}>
                            Aggregierte, anonyme Plattform-Statistik — keine Fall- oder Personendaten.
                        </p>
                    </section>

                    <section className={styles.section} id="kap4" aria-labelledby="kap4-title">
                        <span className={styles.chapterNo}>Kapitel 4</span>
                        <h2 id="kap4-title">Akteure, Rollen und Berechtigungen</h2>
                        <p>
                            Partner, Träger und Betreiber entscheiden gemeinsam über Zwecke und Mittel der Verarbeitung;
                            es besteht eine Vereinbarung über die gemeinsame Verantwortlichkeit (
                            <Norm citation={NORMS.jointResponsibility} preset={preset} />
                            ). Die Plattform kennt vier Personalebenen und die anonyme ratsuchende Person. Intern bilden
                            vierzehn Keycloak-Realm-Rollen die feingranularen API-Rechte ab. Zwei Regeln gelten
                            durchgängig: <strong>hierarchische Isolation</strong> — kein Träger sieht einen anderen,
                            keine Beratungsstelle sieht Ratsuchende oder Beratende einer anderen — und{' '}
                            <strong>Vererbung der Rechtstexte</strong>.
                        </p>

                        <div className={styles.roleGrid}>
                            {ROLE_TIERS.map((role) => (
                                <section
                                    key={role.id}
                                    aria-label={role.name}
                                    className={cx(styles.roleCard, TIER_CLASS[role.tier])}
                                >
                                    <div className={styles.roleHead}>
                                        <DpiaIcon name={role.icon} size="18px" />
                                        <span className={styles.roleName}>{role.name}</span>
                                    </div>
                                    <p className={styles.roleDesc}>{role.description}</p>
                                    <div className={styles.roleTags}>
                                        {role.realmRoles.map((realmRole) => (
                                            <span key={realmRole} data-testid="realm-role" className={styles.realmRole}>
                                                {realmRole}
                                            </span>
                                        ))}
                                        {role.mfaMandatory && <span className={styles.mfaFlag}>2FA Pflicht</span>}
                                    </div>
                                </section>
                            ))}
                        </div>

                        <div className={styles.clientStrip}>
                            <DpiaIcon name="person-circle" size="22px" />
                            <div>
                                <strong>Ratsuchende:r (anonym)</strong> — betritt den Warteraum ohne Registrierung unter
                                einem systemgenerierten Pseudonym; Keycloak-Rolle{' '}
                                <span className={styles.realmRole}>anonymous</span>. Erhoben werden nur Pseudonym,
                                kurzlebiges Sitzungs-Cookie, Warteschlangenposition und das über den Link gewählte
                                Thema. Beim Verlassen werden Pseudonym und Raum automatisiert entfernt. Die Rolle{' '}
                                <span className={styles.realmRole}>user</span> ist für einen künftigen registrierten
                                Ablauf reserviert.
                            </div>
                        </div>

                        <h3 id="kap4-matrix">4.1 Berechtigungsmatrix</h3>
                        <p className={styles.scrollHint}>Tabelle bei schmalen Viewports horizontal scrollbar →</p>
                        {/*
                         * A horizontally scrolling region must be reachable by keyboard (WCAG 2.1.1),
                         * which is exactly what the `tabIndex` here provides. The lint rule only knows
                         * that `region` is a non-interactive role and cannot see the scroll container.
                         */}
                        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
                        <div className={styles.tableScroll} tabIndex={0} role="region" aria-labelledby="kap4-matrix">
                            <table className={styles.matrix}>
                                <thead>
                                    <tr>
                                        <th scope="col">Fähigkeit</th>
                                        {MATRIX_COLUMNS.map((column) => (
                                            <th key={column} scope="col">
                                                {column}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {MATRIX_ROWS.map((row) => (
                                        <tr key={row.capability}>
                                            <th scope="row" style={{ fontWeight: 400, textTransform: 'none' }}>
                                                {row.capability}
                                            </th>
                                            {row.cells.map((cell, index) => (
                                                // eslint-disable-next-line react/no-array-index-key
                                                <MatrixValue key={MATRIX_COLUMNS[index]} cell={cell} />
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h3>4.2 Vererbung der Rechtstexte</h3>
                        <div className={styles.split}>
                            <ol className={styles.cascade}>
                                {INHERITANCE_STEPS.map((step, index) => (
                                    <li key={step.name}>
                                        <div className={styles.cascadeRow}>
                                            <span className={styles.cascadeDot} aria-hidden="true" />
                                            <span className={styles.cascadeName}>{step.name}</span>
                                            {step.maintainer && (
                                                <span className={styles.cascadeWho}>{step.maintainer}</span>
                                            )}
                                        </div>
                                        {index < INHERITANCE_STEPS.length - 1 && (
                                            <div className={styles.cascadeLine} aria-hidden="true" />
                                        )}
                                    </li>
                                ))}
                            </ol>
                            <div className={styles.cascadeNote}>
                                Impressum, Datenschutzerklärung und Einwilligungstext existieren auf jeder Ebene. Pflegt
                                eine Beratungsstelle keine eigene Fassung, gilt die des Trägers; pflegt der Träger
                                keine, gilt die Plattform-Vorlage. Ratsuchende sehen damit immer einen vollständigen
                                Satz Rechtstexte.
                            </div>
                        </div>

                        {showInternalNotes && (
                            <div className={styles.internalNote}>
                                <span className={styles.internalTag}>Intern · Quelle</span>
                                Rollenhierarchie, Realm-Rollen, Matrix und Vererbungskaskade aus{' '}
                                <code>ORISO-Docs/product/roles-permissions.mdx</code> (Abschnitte 3.1–3.5). Maßgeblich
                                ist die Aufzählung in <code>UserRole.java</code>, <code>Authority.java</code> und{' '}
                                <code>ORISO-Keycloak/realm.json</code>. „2FA Pflicht“ für die drei Admin-Ebenen wird
                                seit #891 in der Anwendung erzwungen (<code>adminTwoFactorGate.ts</code>, ohne
                                Aufschub); die serverseitige Durchsetzung am Authentifizierungs-Rand liegt bei
                                UserService/Realm und ist vor Freigabe gegenzuprüfen. „2FA empfohlen“ für Beratende ist
                                weiterhin nur Dokumentationsstand.
                            </div>
                        )}
                    </section>

                    <DpiaChapter5 preset={preset} showInternalNotes={showInternalNotes} onPresetChange={setPreset} />

                    {ADDITIONAL_CHAPTER_IDS.slice(2).map((id) => {
                        const Chapter = chapters[id];
                        return Chapter ? (
                            <Chapter
                                key={id}
                                preset={preset}
                                showInternalNotes={showInternalNotes}
                                onPresetChange={setPreset}
                                masterData={masterData}
                            />
                        ) : null;
                    })}
                    {children}
                </main>
            </div>
        </DpiaEvidenceProvider>
    );
};

export default DpiaDocumentPage;
