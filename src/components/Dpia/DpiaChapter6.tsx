/* Structural port of the issue-named dsfa-page-v2.html; provenance in __fixtures__/README.md. */
import type { DpiaChapterProps } from './DpiaChapterShared';
import styles from './styles.module.scss';
import { EvidenceButton } from './DpiaEvidenceDialog';

export const DpiaChapter6 = ({ showInternalNotes }: DpiaChapterProps) => (
    <section id="kap6" aria-labelledby="kap6-title" className={styles.section}>
        <span className={styles.chapterNo}>Kapitel 6</span>
        <h2 id="kap6-title">Statistische Auswertung</h2>
        <p>
            Statistische Auswertungen erfolgen ausschließlich aggregiert und losgelöst von einzelnen Beratungsfällen. Im
            Administrationsbereich steht ein Statistik-Dashboard zur Verfügung, das ausschließlich Aggregatzahlen
            anzeigt (neue Beratungsanfragen, aktive Fälle, Themenverteilung, Anzahl Beratender — je Träger bzw.
            Beratungsstelle, tages-/wochen-/monatsweise); Einzelpersonen sind daraus nicht ablesbar. Zum Schutz vor
            Rückschlüssen aus kleinen Gruppen greift eine Kleinstzellen-Unterdrückung: Aggregate werden erst ab
            mindestens fünf beitragenden Beratenden ausgewiesen, andernfalls wird der Wert unterdrückt (fail-closed; in
            der Produktivumgebung erzwungen).
            <EvidenceButton evidenceKey="suppression" />
        </p>
        <p>
            Für die Nachrichtenstatistik der Beratenden wird keine Klar-Kennung gespeichert: Die Zählung erfolgt unter
            einem kryptografischen Pseudonym (HMAC-SHA256 über die Beraterkennung mit serverseitig verwaltetem
            Geheimnis). Beratende können ausschließlich ihre eigenen Kennzahlen einsehen; eine personenbezogene
            Leistungsauswertung durch Dritte findet über die Anwendung nicht statt.
            <EvidenceButton evidenceKey="hmac" />
        </p>
        <p>
            Im Browser der Nutzer:innen wird keinerlei Produkt- oder Fehler-Telemetrie erhoben (kein Tracking-SDK, keine
            externen Dienste; vgl. Abschnitt 5.9).
        </p>
        {showInternalNotes && (
            <div className={styles.internalNote}>
                <span className={styles.internalTag}>Intern · Offene Frage Statistik-Konsument</span> Nicht ins
                Trägerdokument: Der UserService kann Statistik-<em>Events</em> an RabbitMQ (
                <code>statistics.topic</code>) publizieren — das Registrierungs-Event enthielte userId + Alter +
                Geschlecht + PLZ + Referer. <code>statistics.enabled=false</code> ist der Repo-Default, aber:{' '}
                <strong>kein Konsument in den 6 gescannten Repos auffindbar</strong>, Speicherort/Retention des
                Downstream-StatisticsService unbekannt, kein AMQP-TLS, kein „Vergessens-Event&quot; bei Kontolöschung.
                Live-Zustand je Umgebung klären, bevor dieses Kapitel finalisiert wird; ggf. Event-Payload minimieren
                (Quasi-Identifikator-Set). Ebenfalls offen: <code>consultant_message_stat</code> ohne Retention und mit{' '}
                <code>source_session_id</code> im Klartext neben dem HMAC (Re-Identifikation über Session-Join).{' '}
            </div>
        )}
    </section>
);
