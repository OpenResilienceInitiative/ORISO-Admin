/* Structural port of the issue-named dsfa-page-v2.html; provenance in __fixtures__/README.md. */
import type { DpiaChapterProps } from './DpiaChapterShared';
import { DpiaTableScroll, DpiaNorm, DpiaMasterDataValue } from './DpiaChapterShared';
import styles from './styles.module.scss';

export const DpiaChapter1 = ({ preset, showInternalNotes, masterData }: DpiaChapterProps) => (
    <section id="kap1" aria-labelledby="kap1-title" className={styles.section}>
        <span className={styles.chapterNo}>Kapitel 1</span>
        <h2 id="kap1-title">Einleitung, Scope und Stammdaten</h2>
        <p className={styles.lede}>
            Die Plattform ist ein Angebot des Betreibers und seiner angeschlossenen Träger. Die Verarbeitung erfolgt in
            gemeinsamer Verantwortlichkeit (<DpiaNorm preset={preset} kdg="§ 28 KDG" dsgvo="Art. 26 DSGVO" />
            ). Gegenstand dieser DSFA ist ausschließlich die Verarbeitung durch den Plattformbetreiber: Bereitstellung
            und technischer Betrieb der Online-Beratungsplattform (nachfolgend „Plattform&quot;).
        </p>
        <h3>1.1 Verantwortlicher</h3>
        <DpiaTableScroll label="Kapitel 1: Einleitung, Scope und Stammdaten">
            <table className={[styles.dataTable, styles.masterDataTable].join(' ')}>
                <tbody>
                    <tr>
                        <th scope="row">Verantwortlicher</th>
                        <td>
                            <DpiaMasterDataValue masterData={masterData} field="operator.legalName" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Anschrift</th>
                        <td>
                            <DpiaMasterDataValue masterData={masterData} field="operator.address" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Kontakt</th>
                        <td>
                            <DpiaMasterDataValue masterData={masterData} field="contact" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Datenschutzbeauftragte:r</th>
                        <td>
                            <DpiaMasterDataValue masterData={masterData} field="operator.dpoName" />
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Zuständige Aufsicht</th>
                        <td>
                            <DpiaNorm
                                preset={preset}
                                kdg="Diözesandatenschutzbeauftragte:r"
                                dsgvo="Landesbeauftragte:r für Datenschutz"
                            />{' '}
                            — <DpiaMasterDataValue masterData={masterData} field="authority" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </DpiaTableScroll>
        {showInternalNotes && (
            <div className={styles.internalNote}>
                <span className={styles.internalTag}>Intern · Dynamik</span> Alle Zellen dieses Blocks sind
                Global-Settings-Felder (Template-Felder 1–8 der Strukturanalyse). Die Aufsichtsbehörde hängt zusätzlich
                am Compliance-Preset — kirchliche Aufsicht (KDG) vs. Landesdatenschutzbehörde (DSGVO), siehe Kapitel 8.{' '}
            </div>
        )}
        <h3>1.2 Anlagen</h3>
        <p>
            Anlage 1 — Risikoanalyse (Auszug in{' '}
            <a className={styles.sourceLink} href="#kap10">
                Kapitel 10
            </a>
            ) · Anlage 2 — Löschkonzept{' '}
            <span className={styles.muted}>
                (beide Anlagen werden als eigenständige, gleichartig versionierte Teildokumente geführt; Stand dieser
                Fassung: in Vorbereitung)
            </span>
        </p>
        <h3>1.3 Wiederholung</h3>
        <p>
            Diese DSFA wird routinemäßig überprüft, nächster Termin:{' '}
            <strong>
                <DpiaMasterDataValue masterData={masterData} field="document.nextReviewDate" />
            </strong>
            . Die Überprüfungshistorie entspricht der Dokumentenhistorie (siehe Versionsblock); jede Version bleibt
            unter ihrer Versions-URL abrufbar, <em>latest</em> verweist auf den aktuellen Stand.
        </p>
    </section>
);
