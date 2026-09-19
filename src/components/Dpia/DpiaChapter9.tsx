/* Structural port of the issue-named dsfa-page-v2.html; provenance in __fixtures__/README.md. */
import type { DpiaChapterProps } from './DpiaChapterShared';
import styles from './styles.module.scss';
import { DpiaNorm } from './DpiaChapterShared';
import { EvidenceButton } from './DpiaEvidenceDialog';

export const DpiaChapter9 = ({ preset, showInternalNotes }: DpiaChapterProps) => (
    <section id="kap9" aria-labelledby="kap9-title" className={styles.section}>
        <span className={styles.chapterNo}>Kapitel 9</span>
        <h2 id="kap9-title">Betroffenenrechte</h2>
        <p>
            Betroffenenrechte (<DpiaNorm preset={preset} kdg="§§ 14 ff. KDG" dsgvo="Art. 12 ff. DSGVO" />) können bei
            jedem gemeinsam Verantwortlichen geltend gemacht werden. Wegen Datenminimierung und
            Ende-zu-Ende-Verschlüsselung ist der Auskunftsumfang beim Betreiber technisch eng begrenzt — je Recht ein
            Kurzfazit:
        </p>
        <ul className={styles.rights}>
            <li>
                <span>
                    Auskunft <DpiaNorm preset={preset} kdg="§ 17 KDG" dsgvo="Art. 15 DSGVO" />
                </span>
                <span>eingeschränkt — nur Registrierungs-/Systemdaten</span>
            </li>
            <li>
                <span>
                    Berichtigung <DpiaNorm preset={preset} kdg="§ 18 KDG" dsgvo="Art. 16 DSGVO" />
                </span>
                <span>eingeschränkt — E-Mail selbst änderbar</span>
            </li>
            <li>
                <span>
                    Löschung <DpiaNorm preset={preset} kdg="§ 19 KDG" dsgvo="Art. 17 DSGVO" />
                </span>
                <span>
                    Selbstlöschung von Konto &amp; Nachrichten
                    <EvidenceButton evidenceKey="delete" />
                </span>
            </li>
            <li>
                <span>
                    Einschränkung <DpiaNorm preset={preset} kdg="§ 20 KDG" dsgvo="Art. 18 DSGVO" />
                </span>
                <span>eingeschränkt — Sperrung oder Löschung</span>
            </li>
            <li>
                <span>
                    Datenübertragbarkeit <DpiaNorm preset={preset} kdg="§ 22 KDG" dsgvo="Art. 20 DSGVO" />
                </span>
                <span>eingeschränkt — Registrierungsdaten exportierbar</span>
            </li>
            <li>
                <span>
                    Widerspruch <DpiaNorm preset={preset} kdg="§ 23 KDG" dsgvo="Art. 21 DSGVO" />
                </span>
                <span>praktisch nicht anwendbar</span>
            </li>
        </ul>
        <p>
            Ratsuchende können einzelne Nachrichten und ihr gesamtes Konto selbstständig löschen. Die Kontolöschung
            durchläuft ein kurzes Schutzfenster (48 Stunden, nur lesender Zugriff) und wird dann automatisiert
            vollzogen: Identitätskonto, Chat-Konto (mit Löschkennzeichen), Beratungsräume und Sitzungsdaten werden
            entfernt. Protokoll- und Nachweisdaten mit eigener Frist sind von der Löschung ausgenommen.
        </p>
        {showInternalNotes && (
            <div className={styles.internalNote}>
                <span className={styles.internalTag}>Intern · Lösch-Lücken</span> Vom Konto-Löschworkflow derzeit NICHT
                erfasst (bestätigen bzw. schließen, bevor „vollständig&quot; behauptet wird):{' '}
                <code>event_notification</code>, <code>draft_message</code>, <code>consultant_message_stat</code>,{' '}
                <code>invite_email_delivery</code>, <code>legacy_chat_identifier_archive</code>;{' '}
                <code>identity_tombstone</code> behält die volle Subjekt-ID unbefristet. Zudem überleben gelöschte Daten
                bis 30 Tage in Matrix-Postgres-Backups.{' '}
            </div>
        )}
    </section>
);
