import { useEffect, useId, useRef, useState } from 'react';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import LockIcon from '@mui/icons-material/Lock';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../../../M3Button';
import { EnforceModeSwitch } from '../EnforceModeSwitch';
import type { PermissionPolicyMode, RecipientScope, RecipientScopePolicy } from '../../../../../types/permissionPolicy';
import { RECIPIENT_SCOPES, isRecipientScopeLocked, resolveRecipientScopePolicy } from './recipientScopePolicy';
import styles from './styles.module.scss';

const KEY = 'tenants.permissions.card.groupInternal.recipientScope';

export type RecipientScopeControlProps = {
    /**
     * The setting as the API served it. Absent on a backend without the field (TenantService#321 not
     * deployed): the control then shows the default read-only, because a save would be ignored.
     */
    policy?: Partial<RecipientScopePolicy> | null;
    level: 'platform' | 'tenant';
    /** Internal group chats are switched off on this tile: the setting stays visible, but cannot change. */
    disabled?: boolean;
    /** Rejects when the save fails; the control then keeps the edit and says so. */
    onSave: (next: Pick<RecipientScopePolicy, 'value' | 'mode'>) => Promise<unknown>;
};

/**
 * "Who can be picked" for internal group chats (ORISO-Admin#1215): three scopes with one plain
 * sentence each. The platform admin also chooses whether the scope is a recommendation or a
 * requirement for the Träger; a Träger admin sees a requirement read-only. Saving is explicit, so a
 * failed save can keep the edit instead of silently jumping back.
 */
export const RecipientScopeControl = ({ policy, level, disabled = false, onSave }: RecipientScopeControlProps) => {
    const { t } = useTranslation();
    const idBase = useId();
    const available = policy != null;
    const resolved = resolveRecipientScopePolicy(policy);
    const locked = !available || isRecipientScopeLocked(resolved, level);
    const [draft, setDraft] = useState<{ value: RecipientScope; mode: PermissionPolicyMode }>({
        value: resolved.value,
        mode: resolved.mode,
    });
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState(false);
    const rootRef = useRef<HTMLElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const refocusAfterSave = useRef(false);
    // While a request is out the draft is the snapshot being saved: another pick would be overwritten
    // when the response brings the saved value back, so the controls wait for it.
    const frozen = disabled || saving;

    // Follow the server once it answers with another value (saved, reloaded, other tenant).
    useEffect(() => {
        setDraft({ value: resolved.value, mode: resolved.mode });
        setFailed(false);
    }, [resolved.value, resolved.mode]);

    // The busy Save button was disabled and the browser may have dropped focus with it: hand it back
    // to where the admin continues (Save to retry, or the chosen option once the save is through).
    useEffect(() => {
        if (saving || !refocusAfterSave.current) return;
        refocusAfterSave.current = false;
        const active = document.activeElement;
        const focusLost =
            !active || active === document.body || (active instanceof HTMLButtonElement && active.disabled);
        if (!focusLost) return;
        const retry = actionsRef.current?.querySelector('button');
        const chosen = rootRef.current?.querySelector<HTMLInputElement>('input[type="radio"]:checked');
        (retry && !retry.disabled ? retry : chosen)?.focus();
    }, [saving]);

    const dirty = draft.value !== resolved.value || draft.mode !== resolved.mode;

    const save = async () => {
        setSaving(true);
        setFailed(false);
        refocusAfterSave.current = true;
        try {
            await onSave(draft);
        } catch {
            setFailed(true);
        } finally {
            setSaving(false);
        }
    };

    const marker = (() => {
        if (!available) return null;
        if (level === 'platform') return resolved.inherited ? t(`${KEY}.marker.default`) : null;
        return resolved.inherited ? t(`${KEY}.marker.inherited`) : t(`${KEY}.marker.own`);
    })();

    let note: string | null = null;
    if (!available) note = t(`${KEY}.unavailable`);
    else if (disabled) note = t('tenants.permissions.feature.requiresMaster');
    else if (locked) note = t(`${KEY}.lockedNote`);
    else if (level === 'tenant' && resolved.inherited && resolved.mode === 'SUGGESTED') {
        note = t(`${KEY}.recommendedNote`);
    }

    const titleId = `${idBase}-title`;
    return (
        <section
            ref={rootRef}
            className={styles.control}
            data-testid="recipient-scope-control"
            aria-labelledby={titleId}
        >
            <div className={styles.heading}>
                <h3 id={titleId} className={styles.title}>
                    {t(`${KEY}.title`)}
                </h3>
                {marker && <span className={styles.marker}>{marker}</span>}
            </div>
            <p className={styles.intro}>{t(`${KEY}.intro`)}</p>

            <RadioGroup
                className={styles.options}
                aria-label={t(`${KEY}.groupLabel`)}
                value={draft.value}
                onChange={(_event, next) => setDraft((current) => ({ ...current, value: next as RecipientScope }))}
            >
                {RECIPIENT_SCOPES.map((scope) => {
                    const hintId = `${idBase}-${scope}`;
                    return (
                        <div key={scope} className={styles.option}>
                            <FormControlLabel
                                value={scope}
                                disabled={locked || frozen}
                                label={t(`${KEY}.option.${scope}.label`)}
                                control={<Radio size="small" slotProps={{ input: { 'aria-describedby': hintId } }} />}
                            />
                            <p id={hintId} className={styles.optionHint}>
                                {t(`${KEY}.option.${scope}.description`)}
                            </p>
                        </div>
                    );
                })}
            </RadioGroup>

            {level === 'platform' && available && (
                <div className={styles.mode}>
                    <EnforceModeSwitch
                        enforceMode={draft.mode === 'ENFORCED'}
                        onChange={(enforce) =>
                            setDraft((current) => ({ ...current, mode: enforce ? 'ENFORCED' : 'SUGGESTED' }))
                        }
                        configLabel={t(`${KEY}.mode.SUGGESTED`)}
                        disabled={frozen}
                        enforceLabel={t(`${KEY}.mode.ENFORCED`)}
                        groupLabel={t(`${KEY}.mode.groupLabel`)}
                    />
                    <p className={styles.note}>{t(`${KEY}.mode.hint.${draft.mode}`)}</p>
                </div>
            )}

            {note && (
                <p className={styles.note}>
                    {locked && available && !disabled && <LockIcon aria-hidden className={styles.noteIcon} />}
                    {note}
                </p>
            )}

            {failed && (
                <p role="alert" className={styles.error}>
                    {t(`${KEY}.saveFailed`)}
                </p>
            )}

            {!locked && (
                <div ref={actionsRef} className={styles.actions}>
                    <M3Button variant="filled" disabled={!dirty || disabled} loading={saving} onClick={save}>
                        {t(`${KEY}.save`)}
                    </M3Button>
                </div>
            )}
        </section>
    );
};
