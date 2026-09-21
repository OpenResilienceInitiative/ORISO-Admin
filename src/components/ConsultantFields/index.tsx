import { useMemo, type ReactNode } from 'react';
import { Form } from 'antd';
import { useWatch } from 'antd/lib/form/Form';
import { useTranslation } from 'react-i18next';
import { MuiFormField, MuiMultilineFormField, MuiPasswordFormField } from '../mui/MuiFormField';
import { MuiSelectField } from '../mui/MuiSelectField';
import { MuiSwitchField } from '../mui/MuiSwitchField';
import { CounsellorAvatarField } from '../CounsellorAvatarField';
import { passwordFormRules, usernameFormRules } from '../../utils/consultantCredentialRules';
import { SALUTATION_KEYS } from '../../utils/salutationKeys';
import styles from './styles.module.scss';

/**
 * THE consultant field set, rendered by the page form (`src/pages/users/Edit`) and the
 * quick-create dialog (`src/components/CreateConsultantModal`).
 *
 * A surface that offers FEWER fields names them through `exclude`; a field missing without
 * being named is a bug. Layout stays with the caller.
 */

/** Identity and credentials — the left column on both surfaces. */
export const CONSULTANT_PERSONAL_FIELDS = [
    'firstname',
    'lastname',
    'displayName',
    'internalDisplayName',
    'avatar',
    'salutation',
    'position',
    'title',
    'adminRemarks',
    'email',
    'username',
    'password',
    'passwordConfirmation',
] as const;

/** Behavioural flags and the absence note. */
export const CONSULTANT_SETTINGS_FIELDS = [
    'formalLanguage',
    'isSupervisor',
    'isGroupchatConsultant',
    'absent',
    'absenceMessage',
] as const;

export type ConsultantFieldName =
    | (typeof CONSULTANT_PERSONAL_FIELDS)[number]
    | (typeof CONSULTANT_SETTINGS_FIELDS)[number];

interface ConsultantFieldsBaseProps {
    /**
     * Fields this surface deliberately does not offer. Explicit on purpose, so an exclusion is
     * always a decision someone made.
     */
    exclude?: readonly ConsultantFieldName[];
}

export interface ConsultantPersonalFieldsProps extends ConsultantFieldsBaseProps {
    /**
     * Read-only surfaces. antd's `Form disabled` reaches every bound control; the avatar picker
     * writes through `setFieldsValue` and needs telling.
     */
    disabled?: boolean;
    /** The username is immutable once the account exists (Keycloak identity). */
    usernameLocked?: boolean;
    /** Focus the first field on mount — for dialogs, not for a whole page. */
    autoFocusFirstField?: boolean;
}

export interface ConsultantSettingsFieldsProps extends ConsultantFieldsBaseProps {
    /**
     * Host-owned controls needing data this component cannot fetch (the supervisor picker).
     * Rendered between the switch group and the absence note.
     */
    children?: ReactNode;
}

const omits = (exclude: readonly ConsultantFieldName[] | undefined, name: ConsultantFieldName) =>
    (exclude ?? []).includes(name);

export const ConsultantPersonalFields = ({
    exclude,
    disabled,
    usernameLocked,
    autoFocusFirstField,
}: ConsultantPersonalFieldsProps) => {
    const { t } = useTranslation();
    const requiredRule = { required: true, message: t('form.errors.required') };
    const has = (name: ConsultantFieldName) => !omits(exclude, name);

    return (
        <>
            {has('firstname') && (
                <MuiFormField
                    name="firstname"
                    label={t('firstname')}
                    placeholder={t('placeholder.firstname')}
                    required
                    rules={[requiredRule]}
                    inputProps={autoFocusFirstField ? { autoFocus: true } : undefined}
                />
            )}

            {has('lastname') && (
                <MuiFormField
                    name="lastname"
                    label={t('lastname')}
                    placeholder={t('placeholder.lastname')}
                    required
                    rules={[requiredRule]}
                />
            )}

            {has('displayName') && (
                <MuiFormField
                    name="displayName"
                    label={t('counselor.displayName')}
                    placeholder={t('counselor.displayName.placeholder')}
                    helpText={t('counselor.displayName.hint')}
                />
            )}

            {has('internalDisplayName') && (
                <MuiFormField
                    name="internalDisplayName"
                    label={t('counselor.internalDisplayName')}
                    placeholder={t('counselor.internalDisplayName.placeholder')}
                    helpText={t('counselor.internalDisplayName.hint')}
                />
            )}

            {has('avatar') && (
                <>
                    {/*
                      Counsellor avatar (#1046). One choice, two stored fields:
                      `avatarKind` is the kind and `avatarId` the motif id, kept
                      in lockstep by `normaliseAvatarValue` so a half choice can
                      never be submitted. The initials preview follows the PUBLIC
                      display name as it is typed — that is the name the advice
                      seeker sees next to the avatar.
                    */}
                    <Form.Item label={t('counselor.avatar')} shouldUpdate>
                        {({ getFieldValue, setFieldsValue }) => (
                            <CounsellorAvatarField
                                value={{
                                    avatarKind: getFieldValue('avatarKind'),
                                    avatarId: getFieldValue('avatarId'),
                                }}
                                disabled={disabled}
                                displayName={getFieldValue('displayName')}
                                firstname={getFieldValue('firstname')}
                                lastname={getFieldValue('lastname')}
                                onChange={(avatar) =>
                                    setFieldsValue({
                                        avatarKind: avatar.avatarKind,
                                        avatarId: avatar.avatarId,
                                    })
                                }
                            />
                        )}
                    </Form.Item>
                    {/* Value carriers only — the picker above is the control. */}
                    <Form.Item name="avatarKind" hidden>
                        <input type="hidden" />
                    </Form.Item>
                    <Form.Item name="avatarId" hidden>
                        <input type="hidden" />
                    </Form.Item>
                </>
            )}

            {has('salutation') && (
                /*
                  Deliberately not clearable. Clearing the select yields
                  `undefined`, which the API layer omits and the backend reads as
                  "leave unchanged" — so the clear affordance would silently fail
                  to persist. `not_specified` ("keine Angabe") is the canonical
                  way to say "no salutation", so nothing is lost by removing it.
                */
                <MuiSelectField
                    name="salutation"
                    label="counselor.salutation"
                    placeholder="plsSelect"
                    options={SALUTATION_KEYS.map((key) => ({
                        value: key,
                        label: t(`counselor.salutation.option.${key}`),
                    }))}
                />
            )}

            {has('position') && (
                <MuiFormField
                    name="position"
                    label={t('counselor.position')}
                    placeholder={t('counselor.position.placeholder')}
                />
            )}

            {has('title') && (
                <MuiFormField
                    name="title"
                    label={t('counselor.personalTitle')}
                    placeholder={t('counselor.personalTitle.placeholder')}
                />
            )}

            {has('adminRemarks') && (
                <MuiMultilineFormField
                    name="adminRemarks"
                    label={t('counselor.adminRemarks')}
                    helpText={t('counselor.adminRemarks.hint')}
                />
            )}

            {has('email') && (
                <MuiFormField
                    name="email"
                    label={t('email')}
                    placeholder={t('placeholder.email')}
                    rules={[
                        {
                            required: true,
                            type: 'email',
                            message: t('message.error.email.incorrect'),
                        },
                    ]}
                />
            )}

            {has('username') && (
                <MuiFormField
                    name="username"
                    label={t('counselor.username')}
                    placeholder={t('placeholder.username')}
                    disabled={usernameLocked}
                    helpText={usernameLocked ? undefined : t('message.error.username.format')}
                    rules={usernameLocked ? undefined : usernameFormRules(t)}
                />
            )}

            {has('password') && (
                <MuiPasswordFormField
                    name="password"
                    label={t('counselor.password')}
                    placeholder={t('placeholder.password')}
                    required
                    rules={[requiredRule, ...passwordFormRules(t)]}
                />
            )}

            {has('passwordConfirmation') && (
                <MuiPasswordFormField
                    name="passwordConfirmation"
                    label={t('counselor.passwordConfirmation')}
                    placeholder={t('placeholder.password')}
                    required
                    dependencies={['password']}
                    rules={[
                        requiredRule,
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('password') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject(new Error(t('profile.passwordChange.error.passwordsNotMatch')));
                            },
                        }),
                    ]}
                />
            )}
        </>
    );
};

export const ConsultantSettingsFields = ({ exclude, children }: ConsultantSettingsFieldsProps) => {
    const { t } = useTranslation();
    // Memoised: antd compares `rules` by identity, and a fresh array re-validates an untouched
    // field on every keystroke.
    const absenceMessageRules = useMemo(
        // `whitespace` because the server checks with `isBlank`, which counts a run of
        // spaces as blank. `required` alone accepts them: a non-empty string is truthy.
        () => [{ required: true, whitespace: true, message: t('form.errors.required') }],
        [t],
    );
    const form = Form.useFormInstance();
    const has = (name: ConsultantFieldName) => !omits(exclude, name);
    // Watch the VALUE, not the switch: a surface may exclude the toggle and still edit a
    // counsellor who is absent.
    const watchedAbsent = useWatch('absent', form);
    // `useWatch` reports a value one render late, so read the store as the fallback. A `false`
    // from the watch still wins, or unticking could not hide the note again.
    const isAbsent = watchedAbsent ?? form?.getFieldValue('absent');

    return (
        <>
            <div className={styles.switchGroup}>
                {has('formalLanguage') && (
                    <MuiSwitchField label={t('counselor.formalLanguage.title')} name="formalLanguage" />
                )}
                {has('isSupervisor') && <MuiSwitchField label={t('counselor.isSupervisor')} name="isSupervisor" />}
                {has('isGroupchatConsultant') && (
                    <MuiSwitchField label={t('counselor.isGroupChatConsultant')} name="isGroupchatConsultant" />
                )}
                {has('absent') && <MuiSwitchField label={t('counselor.absent')} name="absent" />}
            </div>
            {!has('absent') && (
                /*
                 * Value carrier where the toggle is hidden. antd resolves only REGISTERED
                 * fields, and `absent` is required on the update endpoint (`@NotNull`,
                 * primitive column), so the stored value has to travel. Registered and hidden
                 * it round-trips untouched.
                 */
                <Form.Item name="absent" hidden>
                    <input type="hidden" />
                </Form.Item>
            )}
            {children}
            {has('absenceMessage') && isAbsent && (
                // Required while absent: `UserAccountInputValidator#validateAbsence` refuses a
                // blank note on both the create and the update path (400
                // MISSING_ABSENCE_MESSAGE_FOR_ABSENT_USER).
                <MuiMultilineFormField
                    label={t('counselor.absenceMessage')}
                    name="absenceMessage"
                    required
                    rules={absenceMessageRules}
                />
            )}
        </>
    );
};
