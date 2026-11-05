/* Structural port of the issue-named dsfa-page-v2.html; provenance in __fixtures__/README.md. */
import type { DpiaChapterProps } from './DpiaChapterShared';
import { DpiaTableScroll, DpiaNorm } from './DpiaChapterShared';
import styles from './styles.module.scss';

export const DpiaChapter7 = ({ preset }: DpiaChapterProps) => (
    <section id="kap7" aria-labelledby="kap7-title" className={styles.section}>
        <span className={styles.chapterNo}>Kapitel 7</span>
        <h2 id="kap7-title">Datenkategorien und Empfänger</h2>
        <p>
            Löschfristen je Datenkategorie: siehe Anlage 2 — Löschkonzept{' '}
            <span className={styles.muted}>(in Vorbereitung)</span>. Empfänger und Auftragsverarbeiter: siehe Kapitel 4.
        </p>
        <div className={styles.scrollHint}>Querformat-Tabelle — horizontal scrollbar im eigenen Container </div>
        <DpiaTableScroll label="Kapitel 7: Datenkategorien und Empfänger">
            <table className={[styles.dataTable, styles.wideTable].join(' ')}>
                <thead>
                    <tr>
                        <th scope="col">Betroffene</th>
                        <th scope="col">Quelle</th>
                        <th scope="col">Datenkategorien</th>
                        <th scope="col">Schutzklasse</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            Ratsuchende
                            <br />
                            <span className={styles.muted}>mit Registrierung</span>
                        </td>
                        <td>Eigenangabe bei Registrierung und Nutzung</td>
                        <td>
                            <ul>
                                <li>systemgenerierter, pseudonymer Benutzername; Passwort-Hash</li>
                                <li>
                                    Postleitzahl (unverifiziert); je nach Fachbereich optionale Angaben (z. B. Alter,
                                    Anliegen)
                                </li>
                                <li>optional E-Mail-Adresse, 2FA-Merkmale</li>
                                <li>Ende-zu-Ende-verschlüsselte Beratungsinhalte, Dateien und Sprachnachrichten</li>
                                <li>Sitzungs- und Benachrichtigungs-Metadaten</li>
                            </ul>
                        </td>
                        <td>
                            I–III <span className={styles.muted}>je nach freiwilligen Angaben</span>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            Ratsuchende
                            <br />
                            <span className={styles.muted}>Live-Chat, ohne Registrierung</span>
                        </td>
                        <td>Systemgeneriert</td>
                        <td>
                            <ul>
                                <li>generierter, pseudonymer Benutzername</li>
                                <li>temporäre Sitzungsdaten; automatisierte Löschung nach kurzer Frist</li>
                            </ul>
                        </td>
                        <td>I–III</td>
                    </tr>
                    <tr>
                        <td>Beratende</td>
                        <td>Einladung durch Administrator:innen der Träger</td>
                        <td>
                            <ul>
                                <li>Name, dienstliche E-Mail-Adresse</li>
                                <li>Beratungsstelle, Rolle/Teamzuordnung, 2FA-Status</li>
                                <li>pseudonymisierte Tätigkeitsstatistik (HMAC)</li>
                            </ul>
                        </td>
                        <td>I</td>
                    </tr>
                    <tr>
                        <td>
                            Träger-Vertreter:innen
                            <br />
                            <span className={styles.muted}>AVV-Unterzeichnung, keine App-Nutzer</span>
                        </td>
                        <td>Eigenangabe im Signaturprozess</td>
                        <td>
                            <ul>
                                <li>Name, Funktion, Organisation, E-Mail-Adresse</li>
                                <li>
                                    Signaturstatus und -zeitpunkt (Nachweiszweck,{' '}
                                    <DpiaNorm preset={preset} kdg="§ 29 KDG" dsgvo="Art. 28 DSGVO" />)
                                </li>
                            </ul>
                        </td>
                        <td>I</td>
                    </tr>
                    <tr>
                        <td>Administrator:innen</td>
                        <td>Anlage durch Betreiber bzw. Träger</td>
                        <td>
                            <ul>
                                <li>Name, E-Mail-Adresse, Rolle, Mandanten-/Beratungsstellen-Zuordnung</li>
                            </ul>
                        </td>
                        <td>I</td>
                    </tr>
                </tbody>
            </table>
        </DpiaTableScroll>
    </section>
);
