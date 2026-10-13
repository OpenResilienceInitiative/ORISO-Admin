/* Structural port of the issue-named dsfa-page-v2.html; provenance in __fixtures__/README.md. */
import styles from './styles.module.scss';

export const DpiaChapter11 = () => (
    <section id="kap11" aria-labelledby="kap11-title" className={styles.section}>
        <span className={styles.chapterNo}>Kapitel 11</span>
        <h2 id="kap11-title">Verhältnismäßigkeit und Ergebnis</h2>
        <p>
            Die Verhältnismäßigkeit der Verarbeitung wird in vier Schritten geprüft: <strong>legitimer Zweck</strong>{' '}
            (niedrigschwellige, vertrauliche, ortsunabhängige Beratung) → <strong>Geeignetheit</strong> (eine zentrale,
            pseudonym nutzbare Plattform erreicht Personen, die andernfalls keine Hilfe suchen) →{' '}
            <strong>Erforderlichkeit</strong> (kein milderes, gleich geeignetes Mittel; dezentrale Einzellösungen würden
            Auffindbarkeit und kontinuierliche Beratung schwächen) → <strong>Angemessenheit</strong> (Freiwilligkeit
            aller Angaben, Datenminimierung durch pseudonyme Registrierung, anonyme Nutzbarkeit des Live-Chats,
            umfangreiche technische und organisatorische Maßnahmen einschließlich durchgängiger
            Ende-zu-Ende-Verschlüsselung). Es findet keine Profilbildung und kein Marketing statt.
        </p>
        <div className={styles.finalBox}>
            <div className={styles.finalTitle}> Ergebnis der DSFA</div>
            <p>
                Die Verarbeitungstätigkeit kann wie beschrieben umgesetzt werden — unter Beachtung der Maßnahmen aus der
                Risikoanalyse (Anlage 1) und der in den Abschnitten 5.5, 5.6, 5.8 und 9 benannten geplanten
                Härtungsmaßnahmen.{' '}
                <span className={styles.muted}>
                    (Entwurfsfassung — Freigabe durch Datenschutzbeauftragte:n steht aus.)
                </span>
            </p>
        </div>
    </section>
);
