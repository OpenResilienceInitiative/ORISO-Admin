import { Trans, useTranslation } from 'react-i18next';
import { Card } from '../../../../Card';
import { M3Checkbox } from '../../../../M3Checkbox';
import { CheckToggle } from '../CheckToggle';
import type { EnforceChangeHandler, ToggleAfterChangeHandler } from '../types';
import styles from './styles.module.scss';

/**
 * ORISO-Admin#602 — the two permissions an advice seeker's own account depends on.
 *
 * <h3>Switch 1: Anzeigename</h3>
 *
 * Whether the person may **type** their own display name, or may only re-roll the generated one.
 * It is labelled **Anzeigename** and never "Nutzername", and that is not pedantry: the
 * **Anmeldename** (`userName`) is a different, immutable thing, and a Träger admin reading
 * "Nutzername" would believe they are deciding about the login credential. A test asserts the word
 * does not appear on this card.
 *
 * Why forbidding free entry is a real option rather than paternalism: a self-typed nickname is the
 * most common way anonymity is lost, because people reuse a handle that is searchable elsewhere.
 * The dice stays re-rollable without limit, so nothing is taken away.
 *
 * <h3>Switch 2: E-Mail hinterlassen</h3>
 *
 * Whether the person may leave an e-mail address at all. Switching it off silences **both** the
 * in-chat Erstantwort Baustein and the profile field — silencing only one produces the
 * contradiction the switch exists to remove.
 *
 * <h3>House rule: disable, never hide</h3>
 *
 * A setting the platform has not permitted renders as a **disabled** switch with a reason, not as
 * an absent one, so a Träger admin can see that the choice exists and who holds it.
 */

export type AskerPermissionsCardProps = {
    /** Field keys the current role may not change — rendered disabled, never hidden. */
    restrictedFields: Set<string>;
    onToggleUpdate?: ToggleAfterChangeHandler;
    /**
     * "Enforce active states" mode, same contract as the chat-type cards. Without it these two
     * settings would be the only permissions on the page an upper role could not lock for the
     * roles below — a silent hole in the enforcement model rather than a deliberate exemption.
     */
    enforceMode?: boolean;
    enforcedFields?: Set<string>;
    onEnforceChange?: EnforceChangeHandler;
};

const DISPLAY_NAME_FIELD = ['settings', 'featureDisplayNameEditable'];
const ASKER_EMAIL_FIELD = ['settings', 'featureAskerEmailEnabled'];

export const AskerPermissionsCard = ({
    restrictedFields,
    onToggleUpdate,
    enforceMode = false,
    enforcedFields,
    onEnforceChange,
}: AskerPermissionsCardProps) => {
    const { t } = useTranslation();

    /* "Disable, never hide" is only half the rule — a switch that is greyed out
       with no explanation tells an admin they did something wrong. The reason
       says who actually holds the decision. */
    const enforceCheckbox = (field: string, labelKey: string) =>
        enforceMode ? (
            <M3Checkbox
                className={styles.enforceCheckbox}
                label={t('tenants.permissions.enforce.checkboxLabel', { feature: t(labelKey) })}
                checked={enforcedFields?.has(field) ?? false}
                onChange={(next) => onEnforceChange?.(field, next)}
            />
        ) : null;

    const restrictedNote = (field: string) =>
        restrictedFields.has(field) ? (
            <p className={styles.restrictedReason}>{t('tenants.permissions.asker.restrictedReason')}</p>
        ) : null;

    return (
        <Card titleKey="tenants.permissions.asker.title">
            <p className={styles.intro}>
                <Trans i18nKey="tenants.permissions.asker.description" components={{ strong: <strong /> }} />
            </p>

            <div className={styles.setting}>
                <div className={styles.settingHeader}>
                    {enforceCheckbox('featureDisplayNameEditable', 'tenants.permissions.asker.displayName.label')}
                    <span className={styles.settingLabel}>{t('tenants.permissions.asker.displayName.label')}</span>
                    <CheckToggle
                        name={DISPLAY_NAME_FIELD}
                        label={t('tenants.permissions.asker.displayName.label')}
                        disabled={restrictedFields.has('featureDisplayNameEditable')}
                        onAfterChange={onToggleUpdate}
                    />
                </div>
                <p className={styles.settingDescription}>{t('tenants.permissions.asker.displayName.description')}</p>
                {restrictedNote('featureDisplayNameEditable')}
            </div>

            <div className={styles.setting}>
                <div className={styles.settingHeader}>
                    {enforceCheckbox('featureAskerEmailEnabled', 'tenants.permissions.asker.email.label')}
                    <span className={styles.settingLabel}>{t('tenants.permissions.asker.email.label')}</span>
                    <CheckToggle
                        name={ASKER_EMAIL_FIELD}
                        label={t('tenants.permissions.asker.email.label')}
                        disabled={restrictedFields.has('featureAskerEmailEnabled')}
                        onAfterChange={onToggleUpdate}
                    />
                </div>
                <p className={styles.settingDescription}>{t('tenants.permissions.asker.email.description')}</p>
                {restrictedNote('featureAskerEmailEnabled')}
            </div>
        </Card>
    );
};
