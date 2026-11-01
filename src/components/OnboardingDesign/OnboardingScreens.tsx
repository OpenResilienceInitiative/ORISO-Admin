import { useState } from 'react';
import { M3Button } from '../M3Button';
import { AvatarPickerDialog } from './AvatarPickerDialog';
import { CounsellorAvatarBlock } from './CounsellorAvatarBlock';
import { OnboardingFlow } from './OnboardingFlow';
import { OnboardingLeadArt, type OnboardingLeadVariant } from './OnboardingLeadArt';
import { OnboardingPageHeader } from './OnboardingPageHeader';
import { OnboardingPasswordField } from './OnboardingPasswordField';
import { OutlinedTextField } from './OutlinedTextField';
import { PasswordRuleChips } from './PasswordRuleChips';
import { passwordCopy, ruleLabels } from './onboardingCopy';
import { allPasswordRulesMet } from './passwordRules';
import { ANIMAL_AVATARS } from '../../resources/img/svg/avatars';
import type { CounsellorAvatarValue } from '../../utils/counsellorAvatar';
import styles from './styles.module.scss';

/* Presentational screens of the design boards 2–9. They hold their own input
   state and report the final password through `onSubmit`; no network, no
   routing. The production pages adopt the building blocks, not these. */

const useRepeatedPassword = () => {
    const [password, setPassword] = useState('');
    const [repeat, setRepeat] = useState('');
    const mismatch = repeat.length > 0 && repeat !== password;
    const canSubmit = allPasswordRulesMet(password) && repeat === password;
    return { password, setPassword, repeat, setRepeat, mismatch, canSubmit };
};

interface PasswordFormProps {
    submitLabel: string;
    onSubmit: (password: string) => void;
    /** Rendered between the chips and the repeat field — used by nothing yet, reserved for the optional "Weitere Angaben". */
    back?: { label: string; onClick: () => void };
    repeatField?: boolean;
}

const PasswordForm = ({ submitLabel, onSubmit, back, repeatField = true }: PasswordFormProps) => {
    const { password, setPassword, repeat, setRepeat, mismatch, canSubmit } = useRepeatedPassword();
    const ready = repeatField ? canSubmit : allPasswordRulesMet(password);

    return (
        <form
            className={styles.form}
            onSubmit={(event) => {
                event.preventDefault();
                if (ready) onSubmit(password);
            }}
        >
            <OnboardingPasswordField
                label={passwordCopy.password}
                value={password}
                onChange={setPassword}
                showLabel={passwordCopy.show}
                hideLabel={passwordCopy.hide}
            />
            <PasswordRuleChips
                password={password}
                labels={ruleLabels}
                listLabel={passwordCopy.ruleList}
                metLabel={passwordCopy.met}
                openLabel={passwordCopy.open}
            />
            {repeatField && (
                <>
                    <OnboardingPasswordField
                        className={styles.fieldNext}
                        label={passwordCopy.repeat}
                        value={repeat}
                        onChange={setRepeat}
                        showLabel={passwordCopy.show}
                        hideLabel={passwordCopy.hide}
                    />
                    {mismatch && (
                        <p className={styles.fieldError} role="alert">
                            {passwordCopy.mismatch}
                        </p>
                    )}
                </>
            )}
            <div className={back ? styles.actionRow : styles.submit}>
                {back && (
                    <M3Button variant="outlined" onClick={back.onClick}>
                        {back.label}
                    </M3Button>
                )}
                <M3Button variant="filled" type="submit" block disabled={!ready}>
                    {submitLabel}
                </M3Button>
            </div>
        </form>
    );
};

const Page = ({ children }: { children: React.ReactNode }) => <main className={styles.page}>{children}</main>;

export interface ExistingAccountScreenProps {
    /** "Träger-Admin" or "Berater*in / BST-Admin" — the role named in the kicker. */
    roleLabel: string;
    email: string;
    initials: string;
    onSubmit?: (password: string) => void;
}

/** Boards 2 + 3: an account exists already, the person only chooses a password. */
export const ExistingAccountScreen = ({
    roleLabel,
    email,
    initials,
    onSubmit = () => {},
}: ExistingAccountScreenProps) => (
    <Page>
        <OnboardingPageHeader
            lead={<OnboardingLeadArt variant="initials" initials={initials} />}
            title="Legen Sie Ihr Passwort fest"
            intro="Ihr Konto wurde bereits angelegt. Wählen Sie Ihr eigenes Passwort. Rolle, Zuordnungen und Zwei-Faktor bleiben erhalten."
            kicker={`${roleLabel} · E-Mail-Adresse`}
            value={email}
        />
        <PasswordForm submitLabel="Passwort speichern" onSubmit={onSubmit} />
    </Page>
);

export interface NewTenantAccountScreenProps {
    tenantName: string;
    email: string;
    onSubmit?: (password: string) => void;
    onBack?: () => void;
}

/** Board 4: new Träger, step 2 of 3, with the flow and the time hint. */
export const NewTenantAccountScreen = ({
    tenantName,
    email,
    onSubmit = () => {},
    onBack = () => {},
}: NewTenantAccountScreenProps) => (
    <Page>
        <OnboardingPageHeader
            lead={
                <OnboardingFlow
                    summary="Schritt 2 von 3: Konto. Noch etwa 3 Minuten."
                    eta="noch ca. 3 Min"
                    steps={[
                        { label: 'Organisation', state: 'done' },
                        { label: 'Konto', state: 'current' },
                        { label: 'Absichern', state: 'upcoming' },
                    ]}
                />
            }
            title="Konto erstellen"
            intro={`Ihr Admin-Konto für Träger ${tenantName}.`}
            kicker="E-Mail-Adresse"
            value={email}
        />
        <PasswordForm submitLabel="Konto erstellen" onSubmit={onSubmit} back={{ label: 'Zurück', onClick: onBack }} />
    </Page>
);

export interface ResetScreenProps {
    onSubmit?: (password: string) => void;
}

/** Board 5. */
export const ResetScreen = ({ onSubmit = () => {} }: ResetScreenProps) => (
    <Page>
        <OnboardingPageHeader
            lead={<OnboardingLeadArt variant="refresh" />}
            title="Neues Passwort festlegen"
            intro="Wählen Sie ein Passwort, das Sie nur hier verwenden."
        />
        <PasswordForm submitLabel="Passwort speichern" onSubmit={onSubmit} />
    </Page>
);

export interface MessageScreenProps {
    variant: Extract<OnboardingLeadVariant, 'check' | 'clock'>;
    title: string;
    intro: string;
    actionLabel: string;
    onAction?: () => void;
}

/** Boards 6 + 7: a closing message with one action. */
export const MessageScreen = ({ variant, title, intro, actionLabel, onAction = () => {} }: MessageScreenProps) => (
    <Page>
        <OnboardingPageHeader lead={<OnboardingLeadArt variant={variant} />} title={title} intro={intro} />
        <div className={styles.submit}>
            <M3Button variant="filled" block onClick={onAction}>
                {actionLabel}
            </M3Button>
        </div>
    </Page>
);

export const DoneScreen = ({ onAction }: { onAction?: () => void }) => (
    <MessageScreen
        variant="check"
        title="Passwort gespeichert"
        intro="Melden Sie sich jetzt an. Die Zwei-Faktor-Anmeldung bleibt wie bisher."
        actionLabel="Zum Login"
        onAction={onAction}
    />
);

export const ExpiredScreen = ({ onAction }: { onAction?: () => void }) => (
    <MessageScreen
        variant="clock"
        title="Dieser Link ist abgelaufen"
        intro="Bitten Sie Ihre Ansprechperson um einen neuen Link. Ihr Konto bleibt unverändert."
        actionLabel="Zum Login"
        onAction={onAction}
    />
);

export interface NewCounsellorScreenProps {
    /** Suggested by the inviting admin; the invitee may change both. */
    suggestedAvatar: CounsellorAvatarValue;
    suggestedDisplayName: string;
    username: string;
    onSubmit?: (result: {
        password: string;
        avatar: CounsellorAvatarValue;
        displayName: string;
        username: string;
    }) => void;
}

const avatarLabel = (avatar: CounsellorAvatarValue, suggested: boolean): string => {
    const motif =
        avatar.avatarKind === 'ICON' ? ANIMAL_AVATARS.find(({ id }) => id === avatar.avatarId)?.id : undefined;
    const name = motif ? motif.charAt(0).toUpperCase() + motif.slice(1) : 'Initialen';
    return suggested ? `${name}, vorgeschlagenes Icon` : `${name}, gewähltes Icon`;
};

/** Boards 8 + 9: new counsellor, name and icon preselected, "Ändern" opens the popup. */
export const NewCounsellorScreen = ({
    suggestedAvatar,
    suggestedDisplayName,
    username: initialUsername,
    onSubmit = () => {},
}: NewCounsellorScreenProps) => {
    const [avatar, setAvatar] = useState(suggestedAvatar);
    const [displayName, setDisplayName] = useState(suggestedDisplayName);
    const [username, setUsername] = useState(initialUsername);
    const [password, setPassword] = useState('');
    const [picking, setPicking] = useState(false);
    const ready = allPasswordRulesMet(password) && displayName.trim().length > 0 && username.trim().length > 0;

    return (
        <Page>
            <OnboardingPageHeader
                lead={
                    <OnboardingFlow
                        summary="Schritt 1 von 2: Konto. Noch etwa 2 Minuten."
                        eta="noch ca. 2 Min"
                        steps={[
                            { label: 'Konto', state: 'current' },
                            { label: 'Absichern', state: 'upcoming' },
                        ]}
                    />
                }
                title="Konto erstellen"
                intro="Name und Icon hat Ihre Beratungsstelle vorgeschlagen. Sie können beides ändern."
            />
            <div className={styles.who}>
                <CounsellorAvatarBlock
                    {...avatar}
                    displayName={displayName}
                    label={avatarLabel(avatar, avatar === suggestedAvatar)}
                    changeLabel="Ändern"
                    onChange={() => setPicking(true)}
                />
                <div className={styles.nameFields}>
                    <OutlinedTextField
                        label="Anzeigename"
                        value={displayName}
                        autoComplete="name"
                        onChange={setDisplayName}
                    />
                    <OutlinedTextField
                        label="Benutzername"
                        value={username}
                        autoComplete="username"
                        onChange={setUsername}
                    />
                </div>
            </div>
            <form
                className={styles.passwordBlock}
                onSubmit={(event) => {
                    event.preventDefault();
                    if (ready) onSubmit({ password, avatar, displayName, username });
                }}
            >
                <OnboardingPasswordField
                    className={styles.fieldFirst}
                    label={passwordCopy.password}
                    value={password}
                    onChange={setPassword}
                    showLabel={passwordCopy.show}
                    hideLabel={passwordCopy.hide}
                />
                <PasswordRuleChips
                    password={password}
                    labels={ruleLabels}
                    listLabel={passwordCopy.ruleList}
                    metLabel={passwordCopy.met}
                    openLabel={passwordCopy.open}
                />
                <button type="button" className={styles.more} aria-expanded={false}>
                    <span>
                        Weitere Angaben<span className={styles.moreHint}>Anrede, Position, Titel (optional)</span>
                    </span>
                </button>
                <M3Button variant="filled" type="submit" block disabled={!ready}>
                    Konto erstellen
                </M3Button>
            </form>
            {picking && (
                <AvatarPickerDialog
                    value={avatar}
                    displayName={displayName}
                    title="Icon wählen"
                    description="Ratsuchende sehen es neben Ihrem Namen."
                    cancelLabel="Abbrechen"
                    confirmLabel="Übernehmen"
                    onCancel={() => setPicking(false)}
                    onConfirm={(value) => {
                        setAvatar(value);
                        setPicking(false);
                    }}
                />
            )}
        </Page>
    );
};
