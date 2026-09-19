import type { ReactNode } from 'react';
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
 * THE consultant field set. Two surfaces render it — the full page form
 * (`src/pages/users/Edit`) and the quick-create dialog on the agency screen
 * (`src/components/CreateConsultantModal`) — and before this module existed the
 * dialog re-stated a subset of the page's fields. That is how the same person,
 * created from two screens, became two different records: the tone was decided
 * for the admin on one screen and chosen on the other, and the avatar was never
 * asked for at all.
 *
 * The rule here: a surface that offers FEWER fields says which ones, through
 * `exclude`. A field that is missing without being named is a bug, not a
 * layout decision. Layout stays with the caller (the page uses cards in a
 * two-column grid, the dialog flows the same fields into two columns), because
 * the thing worth sharing is what a consultant IS, not where the boxes sit.
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
     * Fields this surface deliberately does not offer. Required to be explicit:
     * every exclusion needs a reason at the call site, so "the dialog is missing
     * a field" can never again be something nobody decided.
     */
    exclude?: readonly ConsultantFieldName[];
}

export interface ConsultantPersonalFieldsProps extends ConsultantFieldsBaseProps {
    /**
     * Read-only surfaces. antd's `Form disabled` already reaches every bound
     * control through ConfigProvider; the avatar picker is not a bound control
     * (it writes through `setFieldsValue`), so it needs telling.
     */
    disabled?: boolean;
    /** The username is immutable once the account exists (Keycloak identity). */
    usernameLocked?: boolean;
    /** Focus the first field on mount — for dialogs, not for a whole page. */
    autoFocusFirstField?: boolean;
}

export interface ConsultantSettingsFieldsProps extends ConsultantFieldsBaseProps {
    /**
     * Host-owned controls that need data this component cannot fetch (the
     * standing-supervisor picker, whose options come from a consultant search).
     * Rendered between the switch group and the absence note, where the page
     * form has always had them.
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
    const requiredRule = { required: true, message: t('form.errors.required') };
    const form = Form.useFormInstance();
    const has = (name: ConsultantFieldName) => !omits(exclude, name);
    /*
     * Watch the VALUE, not the switch. A surface may exclude the `absent`
     * toggle and still edit a consultant who is absent — the page form does
     * exactly that — and the stored note must stay reachable there.
     */
    const watchedAbsent = useWatch('absent', form);
    /*
     * `useWatch` only reports a value once it has subscribed, which is one
     * render late — including on the surfaces where the value comes from the
     * hidden carrier below rather than from a switch — so read the store as
     * the fallback. `false` from the watch still wins, or unticking the switch
     * could not hide the note again.
     */
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
                 * Value carrier for a surface that hides the toggle (#1015). antd resolves
                 * only REGISTERED fields in `onFinish`, so without this the flag reaches the
                 * request as `undefined` — and an unstated flag is not `false`: the page form
                 * hides the toggle while editing counsellors who ARE absent, so coercing it
                 * turned an unrelated e-mail correction into "back at work, note deleted".
                 * Omitting it instead is not open here: `absent` is required on the update
                 * endpoint (`@NotNull`, primitive column), so the stored value has to travel.
                 * Registered and hidden, it round-trips untouched; on a create form it stays
                 * undefined and the API layer's `!!` default applies as before.
                 */
                <Form.Item name="absent" hidden>
                    <input type="hidden" />
                </Form.Item>
            )}
            {children}
            {has('absenceMessage') && isAbsent && (
                /*
                 * Required while the counsellor is absent, because the backend insists on it:
                 * `UserAccountInputValidator#validateAbsence` refuses a blank note for an
                 * absent counsellor on the create AND the update path (400
                 * MISSING_ABSENCE_MESSAGE_FOR_ABSENT_USER). Without this the admin spends a
                 * round trip to be told "something went wrong" about a field nothing named.
                 */
                <MuiMultilineFormField
                    label={t('counselor.absenceMessage')}
                    name="absenceMessage"
                    required
                    rules={[requiredRule]}
                />
            )}
        </>
    );
};
