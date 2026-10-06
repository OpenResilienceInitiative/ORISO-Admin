import { useEffect, useRef, useState } from 'react';
import { M3Button } from '../../../../components/M3Button';
import { M3Tooltip } from '../../../../components/M3Tooltip';
import styles from './styles.module.scss';

type Locale = 'de' | 'en';
type Stage = 'invited' | 'account' | 'assignment' | 'password' | 'complete';
type Status =
    | 'draft'
    | 'sent'
    | 'created'
    | 'done'
    | 'replaced'
    | 'revoked'
    | 'expired'
    | 'failure'
    | 'recovery'
    | 'setupFailure';
type View = 'active' | 'history';
interface Fixture {
    id: string;
    name: string;
    status: Status;
    purpose: 'new' | 'existing' | 'password';
    reached: Partial<Record<Stage, string>>;
    replacementId?: string;
}

const fixtures: Fixture[] = [
    { id: 'INV-205', name: 'Frida Beispiel', status: 'sent', purpose: 'new', reached: { invited: '30.09., 22:13' } },
    {
        id: 'INV-206',
        name: 'Alex Beispiel',
        status: 'created',
        purpose: 'new',
        reached: { invited: '30.09., 16:00', account: '30.09., 16:12' },
    },
    { id: 'INV-207', name: 'Kim Beispiel', status: 'draft', purpose: 'new', reached: {} },
    {
        id: 'INV-208',
        name: 'Sam Beispiel',
        status: 'done',
        purpose: 'existing',
        reached: { invited: '29.09., 09:00', assignment: '29.09., 09:04', complete: '29.09., 09:06' },
    },
    { id: 'INV-209', name: 'Robin Beispiel', status: 'failure', purpose: 'new', reached: {} },
    { id: 'INV-210', name: 'Lee Beispiel', status: 'expired', purpose: 'new', reached: { invited: '20.09., 11:00' } },
    { id: 'INV-211', name: 'Ari Beispiel', status: 'sent', purpose: 'password', reached: { invited: '30.09., 10:00' } },
    {
        id: 'INV-212',
        name: 'Noa Beispiel',
        status: 'recovery',
        purpose: 'password',
        reached: { invited: '30.09., 08:00', password: '30.09., 08:06' },
    },
    {
        id: 'INV-213',
        name: 'Dana Beispiel',
        status: 'setupFailure',
        purpose: 'new',
        reached: { invited: '30.09., 07:00', account: '30.09., 07:04' },
    },
    {
        id: 'INV-204',
        name: 'Frida Beispiel',
        status: 'replaced',
        purpose: 'new',
        reached: { invited: '30.09., 22:12', account: '30.09., 22:12' },
        replacementId: 'INV-205',
    },
    { id: 'INV-203', name: 'Pat Beispiel', status: 'revoked', purpose: 'new', reached: { invited: '29.09., 12:00' } },
    {
        id: 'INV-202',
        name: 'Jules Beispiel',
        status: 'replaced',
        purpose: 'new',
        reached: { invited: '28.09., 12:00' },
    },
];

const copy = {
    de: {
        title: 'Einladungen verstehen',
        intro: 'Fortschritt, nächste Schritte und frühere Einladungen an einem Ort.',
        preview: 'Designvorschlag · Beispieldaten · keine E-Mails',
        active: 'Aktuell',
        history: 'Geschlossene Historie',
        designChoice: 'Designentscheidung zur Prüfung: Geschlossene Einladungen stehen in einer eigenen Historie.',
        explanation: 'Erklärung',
        reached: 'Erreicht',
        pending: 'Noch nicht erreicht',
        next: 'Nächster Schritt',
        closed: 'Geschlossen',
        role: 'Rolle',
        counsellor: 'Berater:in',
        admin: 'BST-Admin',
        roleHint: 'Rolle ändern und E-Mail senden sind getrennte Aktionen.',
        roleSaved: 'Rolle im Vorschlag geändert. Es wurde keine E-Mail gesendet.',
        resend: 'Erneut senden',
        send: 'Einladung senden',
        simulation:
            'Vorschau: Erneut senden ist eine ausdrückliche Aktion. Eine echte neue Einladung und das Ersetzen der alten müssen vom Server bestätigt werden. Keine E-Mail gesendet.',
        newPurpose: 'Neues Konto · bestehende Beratungsstelle',
        existingPurpose: 'Vorhandenes Konto · Zuordnung zur Beratungsstelle',
        passwordPurpose: 'Vorhandenes Konto · Passwort einrichten',
        centre: 'Beratungsstelle Nord · besteht seit 12.09.',
        reference: 'Neuere Einladung ansehen',
        unknownReference: 'Keine neuere Einladung vom Server zugeordnet.',
        selectedReference: 'Neuere Einladung: INV-205 · Gesendet am 30.09., 22:13.',
        dismiss: 'Erklärung schließen',
        all: 'Alle Beispiele',
        status: 'Status',
        help: 'Status und Schritte lassen sich mit Maus, Tastatur oder Antippen erklären.',
        statuses: {
            draft: 'Entwurf',
            sent: 'Gesendet',
            created: 'Konto angelegt',
            done: 'Fertig',
            replaced: 'Ersetzt',
            revoked: 'Widerrufen',
            expired: 'Abgelaufen',
            failure: 'Zustellproblem',
            recovery: 'Zugang wiederherstellen',
            setupFailure: 'Einrichtungsproblem',
        },
        hints: {
            draft: 'Diese Einladung wurde vorbereitet. Es wurde noch keine E-Mail gesendet.',
            sent: 'Die E-Mail wurde gesendet. Der nächste Schritt richtet sich nach dem Zweck der Einladung.',
            created: 'Das neue Konto wurde angelegt. Die Einrichtung ist noch nicht abgeschlossen.',
            done: 'Alle für diese Einladung nachgewiesenen Schritte sind abgeschlossen.',
            replaced:
                'Diese Einladung ist geschlossen und wurde durch erneutes Senden ersetzt. Erreichte Schritte und ihre Zeitpunkte bleiben erhalten. Das bedeutet nicht, dass die Kontoanlage fehlgeschlagen ist.',
            revoked:
                'Diese Einladung wurde ausdrücklich widerrufen. Frühere erreichte Schritte bleiben erhalten; der Link kann nicht mehr verwendet werden.',
            expired:
                'Die Gültigkeit dieses Links ist abgelaufen. Erreichte Schritte bleiben erhalten. Eine neue Einladung erfordert eine ausdrückliche Aktion.',
            failure:
                'Die E-Mail konnte nachweislich nicht zugestellt werden. Daraus folgt kein Fehler bei der Kontoanlage.',
            setupFailure:
                'Das Konto besteht. Der Server meldet einen Fehler beim Abschluss der Einrichtung. Erreichte Schritte bleiben bestehen; ein neues Konto würde das Problem nicht lösen.',
            recovery:
                'Das vorhandene Konto braucht eine Wiederherstellung des Zugangs. Hier wird kein zweites Konto angelegt.',
        },
        stages: {
            invited: 'Eingeladen',
            account: 'Konto angelegt',
            assignment: 'Zuordnung bestätigt',
            password: 'Passwort eingerichtet',
            complete: 'Einrichtung abgeschlossen',
        },
        stageHints: {
            invited: 'Dieser Schritt bestätigt die Zustellung der Einladung per E-Mail.',
            account:
                'Hier wird die Kontoanlage einer neuen Person bestätigt; die bestehende Beratungsstelle wird nicht neu angelegt.',
            assignment: 'Hier wird die Zuordnung eines vorhandenen Kontos zur bestehenden Beratungsstelle bestätigt.',
            password: 'Hier wird die Passworteinrichtung für das vorhandene Konto bestätigt.',
            complete: 'Dieser Schritt bestätigt den Abschluss der erforderlichen Zugangsschritte.',
        },
    },
    en: {
        title: 'Understand invitations',
        intro: 'Progress, next steps and earlier invitations in one place.',
        preview: 'Design proposal · sample data · no emails',
        active: 'Current',
        history: 'Closed history',
        designChoice: 'Design choice for review: closed invitations appear in their own history.',
        explanation: 'Explanation',
        reached: 'Reached',
        pending: 'Not reached yet',
        next: 'Next step',
        closed: 'Closed',
        role: 'Role',
        counsellor: 'Counsellor',
        admin: 'Centre admin',
        roleHint: 'Changing a role and sending an email are separate actions.',
        roleSaved: 'Role changed in the proposal. No email was sent.',
        resend: 'Resend invitation',
        send: 'Send invitation',
        simulation:
            'Preview: Resending is an explicit action. The server must confirm a real new invitation and replacement of the old one. No email was sent.',
        newPurpose: 'New account · existing counselling centre',
        existingPurpose: 'Existing account · counselling centre assignment',
        passwordPurpose: 'Existing account · set up password',
        centre: 'North Counselling Centre · established 12 September',
        reference: 'View newer invitation',
        unknownReference: 'No newer invitation reference supplied by the server.',
        selectedReference: 'Newer invitation: INV-205 · Sent on 30 September, 22:13.',
        dismiss: 'Close explanation',
        all: 'All examples',
        status: 'Status',
        help: 'Explore every status and step with a mouse, keyboard or tap.',
        statuses: {
            draft: 'Draft',
            sent: 'Sent',
            created: 'Account created',
            done: 'Complete',
            replaced: 'Replaced',
            revoked: 'Revoked',
            expired: 'Expired',
            failure: 'Delivery problem',
            recovery: 'Recover access',
            setupFailure: 'Setup problem',
        },
        hints: {
            draft: 'This invitation is prepared. No email has been sent yet.',
            sent: 'The email was sent. The next step depends on the purpose of this invitation.',
            created: 'The new account was created. Setup is not complete yet.',
            done: 'All steps evidenced for this invitation are complete.',
            replaced:
                'This invitation is closed and was replaced by an explicit resend. Reached steps and their timestamps are retained. This does not mean account creation failed.',
            revoked:
                'This invitation was explicitly revoked. Previously reached steps remain; the link can no longer be used.',
            expired: 'This link has expired. Reached steps are retained. A new invitation requires an explicit action.',
            failure: 'The email was confirmed undeliverable. This does not imply an account creation failure.',
            setupFailure:
                'The account exists. The server reports a confirmed setup completion failure. Reached steps are retained; creating another account would not solve this problem.',
            recovery: 'The existing account needs access recovery. No second account is created here.',
        },
        stages: {
            invited: 'Invited',
            account: 'Account created',
            assignment: 'Assignment confirmed',
            password: 'Password set up',
            complete: 'Setup complete',
        },
        stageHints: {
            invited: 'This step confirms delivery of the invitation email.',
            account:
                'This confirms account creation for a new person; the existing counselling centre is not being created again.',
            assignment: 'This confirms assignment of an existing account to the existing counselling centre.',
            password: 'This confirms password setup for the existing account.',
            complete: 'This confirms completion of the required access steps.',
        },
    },
};

export interface InviteTrackingProposalProps {
    locale?: Locale;
    initialView?: View;
    onlyStatus?: Status;
}

/** Story-only proposal: explicit fixtures, no service imports or production status derivation. */
export const InviteTrackingProposal = ({
    locale = 'de',
    initialView = 'active',
    onlyStatus,
}: InviteTrackingProposalProps) => {
    const c = copy[locale];
    const [view, setView] = useState<View>(initialView);
    const [explanation, setExplanation] = useState<{ id: string; text: string } | null>(null);
    const [roles, setRoles] = useState<Record<string, string>>({});
    const [notice, setNotice] = useState('');
    const visible = fixtures.filter((fixture) =>
        onlyStatus
            ? fixture.status === onlyStatus
            : (fixture.status === 'replaced' || fixture.status === 'revoked') === (view === 'history'),
    );
    const activeCount = fixtures.filter(
        (fixture) => fixture.status !== 'replaced' && fixture.status !== 'revoked',
    ).length;
    const explanationTrigger = useRef<HTMLButtonElement | null>(null);
    const dismissExplanation = () => {
        setExplanation(null);
        explanationTrigger.current?.focus();
    };
    useEffect(() => {
        if (!explanation) return undefined;
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setExplanation(null);
        };
        document.addEventListener('keydown', onEscape);
        return () => document.removeEventListener('keydown', onEscape);
    }, [explanation]);
    const showExplanation = (id: string, text: string) => {
        explanationTrigger.current =
            document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
        setExplanation({ id, text });
    };

    return (
        <main className={styles.proposal} lang={locale}>
            <header className={styles.header}>
                <span className={styles.preview}>{c.preview}</span>
                <h1>{c.title}</h1>
                <p>{c.intro}</p>
            </header>
            <div className={styles.toolbar} aria-label={locale === 'de' ? 'Einladungen filtern' : 'Filter invitations'}>
                <M3Button
                    variant={view === 'active' ? 'tonal' : 'outlined'}
                    aria-pressed={view === 'active'}
                    onClick={() => {
                        setView('active');
                        setExplanation(null);
                    }}
                >
                    {c.active} · {activeCount}
                </M3Button>
                <M3Button
                    variant={view === 'history' ? 'tonal' : 'outlined'}
                    aria-pressed={view === 'history'}
                    onClick={() => {
                        setView('history');
                        setExplanation(null);
                    }}
                >
                    {c.history} · {fixtures.length - activeCount}
                </M3Button>
            </div>
            <p className={styles.reviewNote}>{c.designChoice}</p>
            <p className={styles.help}>{c.help}</p>
            {notice && (
                <p className={styles.notice} role="status">
                    {notice}
                </p>
            )}
            <div className={styles.list}>
                {visible.map((fixture) => {
                    const closed = fixture.status === 'replaced' || fixture.status === 'revoked';
                    const middleStage: Record<Fixture['purpose'], Stage> = {
                        new: 'account',
                        existing: 'assignment',
                        password: 'password',
                    };
                    const steps: Stage[] = ['invited', middleStage[fixture.purpose], 'complete'];
                    const firstPending = steps.find((stage) => !fixture.reached[stage]);
                    const purposes = { new: c.newPurpose, existing: c.existingPurpose, password: c.passwordPurpose };
                    const purpose = purposes[fixture.purpose];
                    return (
                        <article
                            key={fixture.id}
                            className={styles.invitation}
                            aria-label={`${fixture.name} · ${fixture.id}`}
                        >
                            <div className={styles.person}>
                                <span className={styles.avatar} aria-hidden>
                                    {fixture.name.slice(0, 1)}
                                </span>
                                <div>
                                    <h2>{fixture.name}</h2>
                                    <p>
                                        {fixture.id} · {c.centre}
                                    </p>
                                    <span className={styles.purpose}>{purpose}</span>
                                </div>
                            </div>
                            <div className={styles.progress}>
                                <ol
                                    className={styles.track}
                                    aria-label={locale === 'de' ? 'Onboarding-Fortschritt' : 'Onboarding progress'}
                                >
                                    {steps.map((stage) => {
                                        const reached = fixture.reached[stage];
                                        const current =
                                            !closed &&
                                            fixture.status !== 'draft' &&
                                            fixture.status !== 'failure' &&
                                            stage === firstPending;
                                        let stateLabel = c.pending;
                                        let beadClass = styles.pending;
                                        let beadMark = '';
                                        if (current) {
                                            stateLabel = c.next;
                                            beadClass = styles.current;
                                            beadMark = '•';
                                        }
                                        if (reached) {
                                            stateLabel = c.reached;
                                            beadClass = styles.done;
                                            beadMark = '✓';
                                        }
                                        const text = reached
                                            ? `${c.stageHints[stage]} ${c.reached}: ${reached}.`
                                            : `${c.stages[stage]}: ${c.pending}. ${c.stageHints[stage]} ${
                                                  closed ? `${c.closed}.` : ''
                                              }`;
                                        return (
                                            <li key={stage}>
                                                <M3Tooltip portal text={text}>
                                                    <button
                                                        className={styles.step}
                                                        type="button"
                                                        aria-label={`${c.stages[stage]} · ${stateLabel}${
                                                            reached ? ` · ${reached}` : ''
                                                        }`}
                                                        onClick={() => showExplanation(fixture.id, text)}
                                                    >
                                                        <span className={`${styles.bead} ${beadClass}`} aria-hidden>
                                                            {beadMark}
                                                        </span>
                                                        <span className={styles.stepLabel}>{c.stages[stage]}</span>
                                                        <span className={styles.time}>{reached ?? stateLabel}</span>
                                                    </button>
                                                </M3Tooltip>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </div>
                            <div className={styles.actions}>
                                <M3Tooltip portal text={c.hints[fixture.status]}>
                                    <button
                                        type="button"
                                        className={`${styles.status} ${
                                            fixture.status === 'failure' ||
                                            fixture.status === 'expired' ||
                                            fixture.status === 'setupFailure'
                                                ? styles.attention
                                                : ''
                                        }`}
                                        aria-label={`${c.statuses[fixture.status]} · ${c.explanation}`}
                                        onClick={() => showExplanation(fixture.id, c.hints[fixture.status])}
                                    >
                                        {c.statuses[fixture.status]}
                                        <span aria-hidden> ⓘ</span>
                                    </button>
                                </M3Tooltip>
                                {!closed && (
                                    <div className={styles.actionControls}>
                                        <label className={styles.role} htmlFor={`role-${fixture.id}`}>
                                            {c.role}
                                            <select
                                                id={`role-${fixture.id}`}
                                                value={roles[fixture.id] ?? 'counsellor'}
                                                onChange={(event) => {
                                                    setRoles({ ...roles, [fixture.id]: event.target.value });
                                                    setNotice(c.roleSaved);
                                                }}
                                                disabled={fixture.status === 'done'}
                                            >
                                                <option value="counsellor">{c.counsellor}</option>
                                                <option value="admin">{c.admin}</option>
                                            </select>
                                        </label>
                                        {fixture.status !== 'done' && fixture.purpose !== 'existing' && (
                                            <M3Button variant="outlined" onClick={() => setNotice(c.simulation)}>
                                                {fixture.status === 'draft' ? c.send : c.resend}
                                            </M3Button>
                                        )}
                                        <span className={styles.roleHint}>{c.roleHint}</span>
                                    </div>
                                )}
                                {closed &&
                                    (fixture.replacementId ? (
                                        <M3Button
                                            variant="text"
                                            onClick={() => {
                                                setView('active');
                                                setNotice(c.selectedReference);
                                                setExplanation(null);
                                            }}
                                        >
                                            {c.reference} → {fixture.replacementId}
                                        </M3Button>
                                    ) : (
                                        <span className={styles.roleHint}>
                                            {fixture.status === 'replaced' ? c.unknownReference : c.closed}
                                        </span>
                                    ))}
                            </div>
                            {explanation?.id === fixture.id && (
                                <div className={styles.explanation} role="note">
                                    <p>{explanation.text}</p>
                                    <M3Button onClick={dismissExplanation}>{c.dismiss}</M3Button>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </main>
    );
};
