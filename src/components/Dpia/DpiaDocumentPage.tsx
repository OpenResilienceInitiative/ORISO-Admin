/**
 * DPIA document page — the living Datenschutz-Folgenabschätzung as a product
 * surface rather than a PDF.
 *
 * Scope of this component: the page shell (app bar, compliance preset switch,
 * internal-notes switch, hero, chapter chips) plus the overview sections that
 * the v3 mockups introduced — key figures, roles & permissions, counselling
 * types with the planned appointment module.
 *
 * The eleven verified chapters of the document itself still live in the
 * standalone build at `0 - Docs/artifacts/dsfa-2026-08-13/dsfa-page-v2.html`.
 * Porting them into `children` (one component per chapter, evidence dialogs
 * included) is the documented follow-up; the shell already accepts them.
 */
import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { DpiaIcon } from './DpiaIcon';
import {
    CHAPTERS,
    COUNSELLING_TYPES,
    INHERITANCE_STEPS,
    MATRIX_COLUMNS,
    MATRIX_ROWS,
    NORMS,
    PRESET_LABELS,
    ROLE_TIERS,
    SAMPLE_KEY_FIGURES,
    TECHNICAL_MEASURES,
} from './dpiaContent';
import type { CompliancePreset, KeyFigure, MatrixCell, NormCitation } from './dpiaContent';
import styles from './styles.module.scss';

/** Values in render order; drives both the segmented switch and its roving tabIndex. */
const PRESET_VALUES: CompliancePreset[] = ['kdg', 'dsgvo'];

/**
 * Chapters actually rendered as `<section>`s below (children ported in later
 * are not covered here — see the class doc comment). Keep this in sync with
 * the `id`s used on the `<section>` elements in this file: chip links only
 * point at chapters listed here so keyboard/AT users never land on a dead
 * fragment for `kap1`, `kap2`, or `kap6`–`kap11`.
 */
const AVAILABLE_CHAPTER_IDS = new Set(['kap3', 'kap4', 'kap5']);

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
    /**
     * Chapter-3 key figures. Defaults to `SAMPLE_KEY_FIGURES`, which are
     * shown with an explicit "Beispieldaten" label. Pass the real, versioned
     * numbers here once they exist (ORISO-Admin #735) — that data source is
     * not wired up yet, this prop is only the seam for it — and set
     * `keyFiguresAreSample={false}` so the sample labelling is dropped.
     */
    keyFigures?: KeyFigure[];
    /** Whether `keyFigures` must be labelled as sample data. Defaults to `true`. */
    keyFiguresAreSample?: boolean;
    /** Verified chapter content, rendered below the overview sections. */
    children?: ReactNode;
}

export const DpiaDocumentPage = ({
    operatorName = 'Sunflower CARE gGmbH',
    documentVersion = '0.1-draft',
    documentDate = '14.08.2026',
    statusLabel = 'Entwurf',
    nextReviewDate = '14.08.2027',
    initialPreset = 'kdg',
    initialShowInternalNotes = false,
    keyFigures = SAMPLE_KEY_FIGURES,
    keyFiguresAreSample = true,
    children,
}: DpiaDocumentPageProps) => {
    const [preset, setPreset] = useState<CompliancePreset>(initialPreset);
    const [showInternalNotes, setShowInternalNotes] = useState(initialShowInternalNotes);
    const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const handlePresetKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let nextIndex: number | null = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            nextIndex = (index + 1) % PRESET_VALUES.length;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            nextIndex = (index - 1 + PRESET_VALUES.length) % PRESET_VALUES.length;
        } else if (event.key === 'Home') {
            nextIndex = 0;
        } else if (event.key === 'End') {
            nextIndex = PRESET_VALUES.length - 1;
        }
        if (nextIndex === null) return;
        event.preventDefault();
        setPreset(PRESET_VALUES[nextIndex]);
        segmentRefs.current[nextIndex]?.focus();
    };

    return (
        <div className={styles.page}>
            <header className={styles.appbar}>
                <div className={styles.brand}>
                    <span className={styles.logoSlot} aria-hidden="true">
                        Logo
                    </span>
                    <div>
                        <div className={styles.brandTitle}>Datenschutz-Folgenabschätzung</div>
                        <div className={styles.brandSub}>
                            {operatorName} · <code>/docs/dsfa/latest/</code>
                        </div>
                    </div>
                </div>

                <div className={styles.tools}>
                    <div className={styles.segmented} role="radiogroup" aria-label="Compliance-Preset">
                        {PRESET_VALUES.map((value, index) => (
                            <button
                                key={value}
                                ref={(el) => {
                                    segmentRefs.current[index] = el;
                                }}
                                type="button"
                                role="radio"
                                aria-checked={preset === value}
                                tabIndex={preset === value ? 0 : -1}
                                className={cx(styles.segment, preset === value && styles.segmentActive)}
                                onClick={() => setPreset(value)}
                                onKeyDown={(event) => handlePresetKeyDown(event, index)}
                            >
                                {value === 'kdg' ? 'KDG' : 'DSGVO'}
                            </button>
                        ))}
                    </div>
                    <span className={styles.statusPill}>{statusLabel}</span>
                    <span className={styles.version}>
                        v{documentVersion} · {documentDate}
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
                        <span className={cx(styles.fact, styles.factReview)}>Nächste Überprüfung {nextReviewDate}</span>
                    </div>
                </div>
            </div>

            <nav className={styles.chapterNav} aria-label="Kapitel">
                <div className={styles.chapterNavInner}>
                    {CHAPTERS.map((chapter, index) =>
                        AVAILABLE_CHAPTER_IDS.has(chapter.id) ? (
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
                <section className={styles.section} id="kap3" aria-labelledby="kap3-title">
                    <span className={styles.chapterNo}>Kapitel 3</span>
                    <h2 id="kap3-title">Kontext und Kennzahlen</h2>
                    <p>
                        Die Plattform verbindet Online- und Vor-Ort-Beratung. Der Zugang ist browserbasiert; das
                        Leistungsspektrum umfasst Nachrichten und Dateien, Sprachnachrichten, Gruppenchats,
                        Video-Beratung und einen anonymen Live-Einzelchat.
                    </p>
                    {keyFiguresAreSample && <span className={styles.sampleBadge}>Beispieldaten</span>}
                    <div className={styles.figures}>
                        {keyFigures.map((figure) => (
                            <div key={figure.label} className={styles.figure}>
                                <div className={styles.figureValue}>{figure.value}</div>
                                <div className={styles.figureLabel}>{figure.label}</div>
                            </div>
                        ))}
                    </div>
                    <p className={styles.footnote}>
                        {keyFiguresAreSample
                            ? 'Beispielwerte für die Vorschau, keine echten Betriebszahlen. In der produktiven ' +
                              'Fassung werden hier die aggregierten, anonymen Plattform-Statistiken der DSFA-' +
                              'Stammdaten (Admin#735) angezeigt — nie Fall- oder Personendaten.'
                            : 'Werte werden bei jedem Release aus der aggregierten, anonymen Plattform-Statistik ' +
                              'übernommen — keine Fall- oder Personendaten.'}
                    </p>
                </section>

                <section className={styles.section} id="kap4" aria-labelledby="kap4-title">
                    <span className={styles.chapterNo}>Kapitel 4</span>
                    <h2 id="kap4-title">Akteure, Rollen und Berechtigungen</h2>
                    <p>
                        Partner, Träger und Betreiber entscheiden gemeinsam über Zwecke und Mittel der Verarbeitung; es
                        besteht eine Vereinbarung über die gemeinsame Verantwortlichkeit (
                        <Norm citation={NORMS.jointResponsibility} preset={preset} />
                        ). Die Plattform kennt vier Personalebenen und die anonyme ratsuchende Person. Intern bilden
                        vierzehn Keycloak-Realm-Rollen die feingranularen API-Rechte ab. Zwei Regeln gelten durchgängig:{' '}
                        <strong>hierarchische Isolation</strong> — kein Träger sieht einen anderen, keine
                        Beratungsstelle sieht Ratsuchende oder Beratende einer anderen — und{' '}
                        <strong>Vererbung der Rechtstexte</strong>.
                    </p>

                    <div className={styles.roleGrid}>
                        {ROLE_TIERS.map((role) => (
                            <div key={role.id} className={cx(styles.roleCard, TIER_CLASS[role.tier])}>
                                <div className={styles.roleHead}>
                                    <DpiaIcon name={role.icon} size="18px" />
                                    <span className={styles.roleName}>{role.name}</span>
                                </div>
                                <p className={styles.roleDesc}>{role.description}</p>
                                <div className={styles.roleTags}>
                                    {role.realmRoles.map((realmRole) => (
                                        <span key={realmRole} className={styles.realmRole}>
                                            {realmRole}
                                        </span>
                                    ))}
                                    {role.mfaMandatory && (
                                        <span className={styles.mfaFlag}>2FA erforderlich, Aufschub möglich</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.clientStrip}>
                        <DpiaIcon name="person-circle" size="22px" />
                        <div>
                            <strong>Ratsuchende:r (anonym)</strong> — betritt den Warteraum ohne Registrierung unter
                            einem systemgenerierten Pseudonym; Keycloak-Rolle{' '}
                            <span className={styles.realmRole}>anonymous</span>. Erhoben werden nur Pseudonym,
                            kurzlebiges Sitzungs-Cookie, Warteschlangenposition und das über den Link gewählte Thema.
                            Beim Verlassen werden Pseudonym und Raum automatisiert entfernt. Die Rolle{' '}
                            <span className={styles.realmRole}>user</span> ist für einen künftigen registrierten Ablauf
                            reserviert.
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
                            eine Beratungsstelle keine eigene Fassung, gilt die des Trägers; pflegt der Träger keine,
                            gilt die Plattform-Vorlage. Ratsuchende sehen damit immer einen vollständigen Satz
                            Rechtstexte.
                        </div>
                    </div>

                    {showInternalNotes && (
                        <div className={styles.internalNote}>
                            <span className={styles.internalTag}>Intern · Quelle</span>
                            Rollenhierarchie, Realm-Rollen, Matrix und Vererbungskaskade aus{' '}
                            <code>ORISO-Docs/product/roles-permissions.mdx</code> (Abschnitte 3.1–3.5). Maßgeblich ist
                            die Aufzählung in <code>UserRole.java</code>, <code>Authority.java</code> und{' '}
                            <code>ORISO-Keycloak/realm.json</code>. „2FA empfohlen“ für die beiden unteren Ebenen ist
                            Dokumentationsstand, keine erzwungene Konfiguration — vor Freigabe gegen den Realm
                            gegenprüfen.
                        </div>
                    )}
                </section>

                <section className={styles.section} id="kap5" aria-labelledby="kap5-title">
                    <span className={styles.chapterNo}>Kapitel 5</span>
                    <h2 id="kap5-title">Verfahren und Technik</h2>
                    <p>
                        Zweck der Verarbeitung ist die Bereitstellung und der Betrieb einer Online-Beratungsplattform.
                        Beratungsinhalte werden Ende-zu-Ende-verschlüsselt übertragen und gespeichert; Betreiber und
                        Dienstleister können sie technisch nicht einsehen. Rechtsgrundlage der Inhaltsverarbeitung ist
                        die ausdrückliche Einwilligung (<Norm citation={NORMS.consent} preset={preset} />
                        ).
                    </p>

                    <h3>5.1 Beratungsarten</h3>
                    <div className={styles.typeGrid}>
                        {COUNSELLING_TYPES.map((type) => (
                            <div key={type.id} className={cx(styles.typeCard, type.planned && styles.typeCardPlanned)}>
                                <DpiaIcon name={type.icon} size="24px" />
                                <h4>
                                    {type.title}
                                    {type.planned && <span className={styles.plannedBadge}>in Planung</span>}
                                </h4>
                                <p>{type.description}</p>
                            </div>
                        ))}
                    </div>

                    <div className={styles.planBox}>
                        <div className={styles.planTitle}>
                            <DpiaIcon name="calendar-check" size="14px" />
                            Termine — in Planung, noch nicht ausgeliefert
                        </div>
                        <p>
                            Eine Terminverwaltung (Kalender-/Buchungsmodul) ist{' '}
                            <strong>nicht Bestandteil des aktuellen Leistungsumfangs</strong>. ADR-020 („Scheduled
                            calls, secure invitations, and a unified contact calendar“, Status <em>Accepted</em> vom
                            12.08.2026) beschreibt den geplanten Zuschnitt: Termin, Call-Session und Call-Einladung
                            werden getrennt; der Zugang zu einem Anruf ist eine Träger-Richtlinie, die der Server
                            durchsetzt (Voreinstellung: nur registrierte Teilnehmende). Eingeladene erhalten
                            Mitgliedschaft ausschließlich im Anrufraum, nie im Beratungsfall. Diese DSFA bewertet die
                            geplante Funktion noch nicht — sie wird bei Auslieferung ergänzt.
                        </p>
                    </div>

                    <h3>5.2 Technische Maßnahmen</h3>
                    <div className={styles.measures}>
                        {TECHNICAL_MEASURES.map((measure) => (
                            <span key={measure.label} className={styles.measure}>
                                <DpiaIcon name={measure.icon} size="13px" />
                                {measure.label}
                            </span>
                        ))}
                    </div>
                    <p>
                        Die Plattform basiert auf dem offenen Kommunikationsprotokoll Matrix. Nachrichteninhalte werden
                        auf dem Endgerät verschlüsselt (Olm für Einzel-, Megolm für Gruppenkommunikation) und liegen auf
                        dem Server ausschließlich verschlüsselt. Die Prüfpflicht dieser DSFA folgt aus{' '}
                        <Norm citation={NORMS.dpiaDuty} preset={preset} />.
                    </p>
                </section>

                {children}
            </main>
        </div>
    );
};

export default DpiaDocumentPage;
