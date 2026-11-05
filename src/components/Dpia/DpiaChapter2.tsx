/* Structural port of the issue-named dsfa-page-v2.html; provenance in __fixtures__/README.md. */
import type { DpiaChapterProps } from './DpiaChapterShared';
import styles from './styles.module.scss';
import { DpiaNorm } from './DpiaChapterShared';

export const DpiaChapter2 = ({ preset, showInternalNotes }: DpiaChapterProps) => (
    <section id="kap2" aria-labelledby="kap2-title" className={styles.section}>
        <span className={styles.chapterNo}>Kapitel 2</span>
        <h2 id="kap2-title">Schwellwertanalyse</h2>
        <p>
            Die Pflicht zur Durchführung einer DSFA wurde gemäß{' '}
            <DpiaNorm preset={preset} kdg="§ 35 KDG" dsgvo="Art. 35 DSGVO" /> geprüft.
        </p>
        <details className={styles.threshold}>
            <summary>
                <span className={styles.sumKicker}>Ergebnis</span>
                <span>DSFA erforderlich — durchgeführt </span>
            </summary>
            <div className={styles.thresholdBody}>
                <div className={styles.checklist}>
                    <div className={styles.checklistHead}>Vorfragen</div>
                    <div className={styles.checklistRow}>
                        <span>
                            Verarbeitung auf der Muss-Liste der zuständigen Aufsicht (
                            <DpiaNorm preset={preset} kdg="§ 35 Abs. 5 KDG" dsgvo="Art. 35 Abs. 4 DSGVO" />
                            )?
                        </span>
                        <span className={styles.checklistAnswer}>Nein</span>
                    </div>
                    <div className={styles.checklistRow}>
                        <span>
                            Regelbeispiel erfüllt (
                            <DpiaNorm preset={preset} kdg="§ 35 Abs. 4 KDG" dsgvo="Art. 35 Abs. 3 DSGVO" />
                            )?
                        </span>
                        <span className={styles.checklistAnswer}>Ja</span>
                    </div>
                </div>
                <div className={styles.checklist}>
                    <div className={styles.checklistHead}>
                        Prüffragen (WP-248-Kriterien) — DSFA erforderlich, wenn zwei oder mehr bejaht werden
                    </div>
                    <div className={styles.checklistRow}>
                        <span>Bewerten oder Einstufen (Scoring)?</span>
                        <span className={styles.checklistAnswer}>Nein</span>
                    </div>
                    <div className={styles.checklistRow}>
                        <span>Automatisierte Entscheidungen mit Rechtswirkung?</span>
                        <span className={styles.checklistAnswer}>Nein</span>
                    </div>
                    <div className={styles.checklistRow}>
                        <span>Systematische Überwachung?</span>
                        <span className={styles.checklistAnswer}>Nein</span>
                    </div>
                    <div className={styles.checklistRow}>
                        <span>Vertrauliche oder höchstpersönliche Daten (Beratungsinhalte, Gesundheitsdaten)?</span>
                        <span className={styles.checklistAnswer}>Ja</span>
                    </div>
                    <div className={styles.checklistRow}>
                        <span>Datenverarbeitung in großem Umfang?</span>
                        <span className={styles.checklistAnswer}>Ja</span>
                    </div>
                    <div className={styles.checklistRow}>
                        <span>Abgleich oder Zusammenführung von Datensätzen?</span>
                        <span className={styles.checklistAnswer}>Nein</span>
                    </div>
                    <div className={styles.checklistRow}>
                        <span>Mehrere Verantwortliche / schutzbedürftige Betroffene?</span>
                        <span className={styles.checklistAnswer}>Ja</span>
                    </div>
                    <div className={styles.checklistRow}>
                        <span>Innovative Nutzung neuer Technologien?</span>
                        <span className={styles.checklistAnswer}>Nein</span>
                    </div>
                    <div className={styles.checklistRow}>
                        <span>Ausschluss von der Ausübung eines Rechts?</span>
                        <span className={styles.checklistAnswer}>Nein</span>
                    </div>
                    <div className={styles.checklistRow}>
                        <span>Verarbeitung an öffentlich zugänglichen Orten?</span>
                        <span className={styles.checklistAnswer}>Nein</span>
                    </div>
                </div>
                <p>
                    Eine DSFA <strong>ist durchzuführen</strong>: Es sind besondere Kategorien personenbezogener Daten (
                    <DpiaNorm preset={preset} kdg="§ 11 KDG" dsgvo="Art. 9 DSGVO" />) zu erwarten, die Plattform richtet
                    sich an eine große Zahl teils besonders schutzbedürftiger Ratsuchender, und mehrere Verantwortliche
                    wirken zusammen.
                </p>
            </div>
        </details>
        {showInternalNotes && (
            <div className={styles.internalNote}>
                <span className={styles.internalTag}>Intern · Preset</span> Antworten kommen künftig aus{' '}
                <code>thresholdAnalysis.answers</code> (Checkbox-Set im Admin-Panel). Materieller Preset-Unterschied:
                Unter DSGVO landet eine Online-Krisenberatung mit hoher Wahrscheinlichkeit direkt auf der Muss-Liste der
                Landesbehörde — der Herleitungspfad („Vorfragen&quot;) wechselt mit dem Preset, das Ergebnis bleibt
                gleich.{' '}
            </div>
        )}
    </section>
);
