/* Structural port of the issue-named dsfa-page-v2.html; provenance in __fixtures__/README.md. */
import type { DpiaChapterProps } from './DpiaChapterShared';
import { DpiaTableScroll } from './DpiaChapterShared';
import styles from './styles.module.scss';
import { EvidenceButton } from './DpiaEvidenceDialog';

export const DpiaChapter10 = ({ showInternalNotes }: DpiaChapterProps) => (
    <section id="kap10" aria-labelledby="kap10-title" className={styles.section}>
        <span className={styles.chapterNo}>Kapitel 10</span>
        <h2 id="kap10-title">Risiken und Maßnahmen</h2>
        <p>
            Risiken und Maßnahmen tragen stabile Kennungen (einmal vergeben, nie umnummeriert) und sind dadurch in
            Vorgängen und Audits präzise referenzierbar. Vollständige Matrix: Anlage 1 — Risikoanalyse{' '}
            <span className={styles.muted}>(in Vorbereitung)</span>. Auszug des Ist-Stands:
        </p>
        <div className={styles.scrollHint}>Tabelle horizontal scrollbar </div>
        <DpiaTableScroll label="Kapitel 10: Risiken und Maßnahmen">
            <table className={[styles.dataTable, styles.riskTable].join(' ')}>
                <thead>
                    <tr>
                        <th scope="col">ID</th>
                        <th scope="col">Risiko</th>
                        <th scope="col">Bewertung</th>
                        <th scope="col">Maßnahmen (Ist-Zustand)</th>
                        <th scope="col">Restrisiko</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <span className={styles.referenceId}>R-001</span>
                        </td>
                        <td>Unbefugte Kenntnisnahme von Beratungsinhalten durch Betreiber oder Dienstleister</td>
                        <td>
                            <span className={styles.severity}>hoch</span>
                        </td>
                        <td>
                            <span className={styles.referenceId}>M-001</span> Megolm-E2EE dauerhaft aktiv, kein
                            unverschlüsselter Sendepfad · <span className={styles.referenceId}>M-002</span> extern
                            auditierte Implementierung (vodozemac) · <span className={styles.referenceId}>M-003</span>{' '}
                            AES-256-Dateiverschlüsselung ohne Metadaten-Upload ·{' '}
                            <span className={styles.referenceId}>M-004</span> Föderation deaktiviert
                        </td>
                        <td>
                            <span className={styles.severity}>gering</span>{' '}
                            <span className={styles.muted}>
                                — administrative Serverfunktionen bestehen; Vertraulichkeitsgrenze innerhalb der
                                Beratungsstelle ist Zugriffskontrolle (Abschnitt 5.3/5.7)
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <span className={styles.referenceId}>R-002</span>
                        </td>
                        <td>Übertragung von Schadsoftware oder rechtswidrigen Bildinhalten über Medien-Uploads</td>
                        <td>
                            <span className={styles.severity}>mittel</span>
                        </td>
                        <td>
                            <span className={styles.referenceId}>M-005</span> Blur + Click-to-Reveal im anonymen
                            Live-Chat (fail-closed-Verdikt, Übergangsmaßnahme) ·{' '}
                            <span className={styles.referenceId}>M-006</span> Formatvalidierung + Größenlimit
                            redaktioneller Uploads · <span className={styles.referenceId}>M-007</span>{' '}
                            fail-closed-Scan-Proxy als beschlossene Zielarchitektur (ADR-019, nicht produktiv)
                        </td>
                        <td>
                            <span className={styles.severity}>mittel</span>{' '}
                            <span className={styles.muted}>— bis zur Scanner-Inbetriebnahme</span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <span className={styles.referenceId}>R-003</span>
                        </td>
                        <td>Kontoübernahme durch kompromittierte Anmeldedaten</td>
                        <td>
                            <span className={styles.severity}>mittel</span>
                        </td>
                        <td>
                            <span className={styles.referenceId}>M-008</span> 2FA (Authenticator-App/E-Mail-Einmalcode);
                            Einrichtung für Beratende im Einladungsprozess, Befreiung nur dokumentiert ·{' '}
                            <span className={styles.referenceId}>M-009</span> zentrale, gehashte Passwortspeicherung
                            (Keycloak)
                        </td>
                        <td>
                            <span className={styles.severity}>gering</span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <span className={styles.referenceId}>R-004</span>
                        </td>
                        <td>Re-Identifizierung Einzelner aus statistischen Auswertungen</td>
                        <td>
                            <span className={styles.severity}>mittel</span>
                        </td>
                        <td>
                            <span className={styles.referenceId}>M-010</span> ausschließlich Aggregatzahlen mit
                            Kleinstzellen-Unterdrückung (min. 5, fail-closed) ·{' '}
                            <span className={styles.referenceId}>M-011</span> HMAC-SHA256-Pseudonymisierung der
                            Beraterstatistik
                        </td>
                        <td>
                            <span className={styles.severity}>gering</span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <span className={styles.referenceId}>R-005</span>
                        </td>
                        <td>Verlust des Schlüsselmaterials der Nutzer:innen (Unlesbarkeit der eigenen Historie)</td>
                        <td>
                            <span className={styles.severity}>mittel</span>
                        </td>
                        <td>
                            <span className={styles.referenceId}>M-012</span> serverseitiges, verschlüsseltes
                            Schlüssel-Backup; Wiederherstellungsgeheimnis verbleibt beim Nutzer
                        </td>
                        <td>
                            <span className={styles.severity}>gering</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </DpiaTableScroll>
        {showInternalNotes && (
            <div className={styles.internalNote}>
                <span className={styles.internalTag}>Intern · Anlage 1</span> Weitere Risiko-Kandidaten aus den
                Inventaren für die Vollmatrix: Ingress-Access-Logs mit Client-IP (Frist undefiniert; Admin-Container
                loggt bereits IP-frei), Matrix-DB-Backup-Skripte mit GitHub-Sync (Aktivierungsstatus klären —
                kritischster Einzelfund), Google-STUN in <code>turn_uris</code> (IP-Abfluss Drittland), offene
                Synapse-Registrierung + unauthentifizierte Medien, LLM-Übersetzung von Rechtstexten (Mistral/OpenRouter,
                Drittland), SMTP-Credentials teils unverschlüsselt
                <EvidenceButton evidenceKey="tenantsettings" />. Keine dieser Positionen ist im Trägertext behauptet
                oder verneint.{' '}
            </div>
        )}
    </section>
);
