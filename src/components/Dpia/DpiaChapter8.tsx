/* Structural port of the issue-named dsfa-page-v2.html; provenance in __fixtures__/README.md. */
import type { DpiaChapterProps } from './DpiaChapterShared';
import { DpiaPresetSwitch } from './DpiaPresetSwitch';
import { PRESET_LABELS } from './dpiaContent';
import { DpiaTableScroll, DpiaNorm } from './DpiaChapterShared';
import styles from './styles.module.scss';

export const DpiaChapter8 = ({ preset, showInternalNotes, onPresetChange }: DpiaChapterProps) => (
    <section id="kap8" aria-labelledby="kap8-title" className={styles.section}>
        <span className={styles.chapterNo}>Kapitel 8</span>
        <h2 id="kap8-title">Rechtsrahmen und Rechtsgrundlagen</h2>
        <p>
            <DpiaPresetSwitch preset={preset} onChange={onPresetChange} label="Compliance-Preset (Kapitel 8)" />
            <span className={styles.muted}>
                {' '}
                Aktives Preset: <strong>{PRESET_LABELS[preset]}</strong> — alle Normzitate im Dokument schalten mit um.{' '}
            </span>
        </p>
        {showInternalNotes && (
            <div className={styles.internalNote}>
                <span className={styles.internalTag}>Intern · Preset</span>
                <code>legal.framework = KDG | DSGVO</code> (bestehendes Compliance-Preset im Admin-Panel) steuert: (a)
                sämtliche Norm-Badges via Mapping-Tabelle, (b) die Vorfragen der Schwellwertanalyse, (c) den Abschnitt
                Rechtsgrundlage Beratende — einziger inhaltlich umzuschreibender Text, da „kirchliches Interesse&quot;
                kein DSGVO-Pendant hat —, (d) den Aufsichtsbehörden-Block (1.1). Der Rest des Dokuments ist
                preset-neutral.{' '}
            </div>
        )}
        <h3>8.1 Rechtsgrundlagen je Verarbeitungsschritt</h3>
        <DpiaTableScroll label="Kapitel 8: Rechtsrahmen und Rechtsgrundlagen">
            <table className={styles.dataTable}>
                <thead>
                    <tr>
                        <th scope="col">Verarbeitungsschritt</th>
                        <th scope="col">Rechtsgrundlage</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Technische Nutzungsdaten (Sitzung, Betrieb)</td>
                        <td>
                            <DpiaNorm preset={preset} kdg="§ 6 Abs. 1 lit. g KDG" dsgvo="Art. 6 Abs. 1 lit. f DSGVO" />{' '}
                            — berechtigtes Interesse
                        </td>
                    </tr>
                    <tr>
                        <td>Registrierungsdaten der Ratsuchenden</td>
                        <td>
                            <DpiaNorm preset={preset} kdg="§ 6 Abs. 1 lit. b KDG" dsgvo="Art. 6 Abs. 1 lit. a DSGVO" />{' '}
                            — Einwilligung
                        </td>
                    </tr>
                    <tr>
                        <td>Beratungsinhalte inkl. besonderer Kategorien</td>
                        <td>
                            <DpiaNorm
                                preset={preset}
                                kdg="§ 6 Abs. 1 lit. b i. V. m. § 11 KDG"
                                dsgvo="Art. 9 Abs. 2 lit. a DSGVO"
                            />{' '}
                            — ausdrückliche Einwilligung; E2EE als Schutzmaßnahme
                        </td>
                    </tr>
                    <tr>
                        <td>Daten der Beratenden</td>
                        <td>
                            <DpiaNorm
                                preset={preset}
                                kdg="§ 6 Abs. 1 lit. g und lit. f KDG"
                                dsgvo="Art. 6 Abs. 1 lit. b oder f DSGVO"
                            />
                            <span className={styles.muted}>— Textbaustein wechselt mit Preset</span>
                        </td>
                    </tr>
                    <tr>
                        <td>AVV-Signaturdaten der Träger-Vertreter:innen</td>
                        <td>
                            <DpiaNorm
                                preset={preset}
                                kdg="§ 6 Abs. 1 lit. g i. V. m. § 29 KDG"
                                dsgvo="Art. 6 Abs. 1 lit. c i. V. m. Art. 28 DSGVO"
                            />{' '}
                            — Nachweispflichten
                        </td>
                    </tr>
                </tbody>
            </table>
        </DpiaTableScroll>
    </section>
);
