import { useEffect, useId, useRef, useState } from 'react';
import LockIcon from '@mui/icons-material/Lock';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../../../M3Button';
import { M3Switch } from '../../../../M3Switch';
import { Notify } from '../../../../Notify';
import { EnforceModeSwitch } from '../EnforceModeSwitch';
import type { PermissionPolicyMode, PolicyValue } from '../../../../../types/permissionPolicy';
import { isCalendarPolicyLocked, resolveShowAskerUsernamesPolicy } from './calendarPolicy';
import styles from '../RecipientScope/styles.module.scss';

const KEY = 'tenants.permissions.calendar.showAskerUsernames';

export type AskerUsernamesControlProps = {
    /** The setting as the API served it. Absent on a backend without the field: shown read-only. */
    policy?: Partial<PolicyValue<boolean>> | null;
    level: 'platform' | 'tenant';
    /** Rejects when the save fails; the control then keeps the edit and says so. */
    onSave: (next: Pick<PolicyValue<boolean>, 'value' | 'mode'>) => Promise<unknown>;
};

/**
 * "Show advice seekers' usernames" in colleagues' calendars (ADR-032): off by default, and never
 * more than the username. Same shape as the calendar reach above it: the platform admin also
 * chooses recommendation or requirement, a Träger admin sees a requirement read-only, and saving
 * is explicit so a failed save keeps the edit.
 */
export const AskerUsernamesControl = ({ policy, level, onSave }: AskerUsernamesControlProps) => {
    const { t } = useTranslation();
    const idBase = useId();
    const available = policy != null;
    const resolved = resolveShowAskerUsernamesPolicy(policy);
    const locked = !available || isCalendarPolicyLocked(resolved, level);
    const [draft, setDraft] = useState<{ value: boolean; mode: PermissionPolicyMode }>({
        value: resolved.value,
        mode: resolved.mode,
    });
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState(false);
    const rootRef = useRef<HTMLElement>(null);
    const actionsRef = useRef<HTMLDivElement>(null);
    const refocusAfterSave = useRef(false);

    useEffect(() => {
        setDraft({ value: resolved.value, mode: resolved.mode });
        setFailed(false);
    }, [resolved.value, resolved.mode]);

    // Hand focus back when the busy Save button dropped it (Save to retry, else the switch).
    useEffect(() => {
        if (saving || !refocusAfterSave.current) return;
        refocusAfterSave.current = false;
        const active = document.activeElement;
        const focusLost =
            !active || active === document.body || (active instanceof HTMLButtonElement && active.disabled);
        if (!focusLost) return;
        const retry = actionsRef.current?.querySelector('button');
        const toggle = rootRef.current?.querySelector<HTMLButtonElement>('[role="switch"]');
        (retry && !retry.disabled ? retry : toggle)?.focus();
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
    else if (locked) note = t(`${KEY}.lockedNote`);
    else if (level === 'tenant' && resolved.inherited && resolved.mode === 'SUGGESTED') {
        note = t(`${KEY}.recommendedNote`);
    }

    const titleId = `${idBase}-title`;
    return (
        <section
            ref={rootRef}
            className={styles.control}
            data-testid="calendar-asker-usernames-control"
            aria-labelledby={titleId}
        >
            <div className={styles.heading}>
                <h3 id={titleId} className={styles.title}>
                    {t(`${KEY}.title`)}
                </h3>
                {marker && <span className={styles.marker}>{marker}</span>}
            </div>
            <p className={styles.intro}>{t(`${KEY}.intro`)}</p>

            <M3Switch
                label={t(`${KEY}.title`)}
                checked={draft.value}
                disabled={locked || saving}
                onChange={(value) => setDraft((current) => ({ ...current, value }))}
            />

            {level === 'platform' && available && (
                <div className={styles.mode}>
                    <EnforceModeSwitch
                        enforceMode={draft.mode === 'ENFORCED'}
                        onChange={(enforce) =>
                            setDraft((current) => ({ ...current, mode: enforce ? 'ENFORCED' : 'SUGGESTED' }))
                        }
                        configLabel={t(`${KEY}.mode.SUGGESTED`)}
                        disabled={saving}
                        enforceLabel={t(`${KEY}.mode.ENFORCED`)}
                        groupLabel={t(`${KEY}.mode.groupLabel`)}
                    />
                    <p className={styles.note}>{t(`${KEY}.mode.hint.${draft.mode}`)}</p>
                </div>
            )}

            {note && (
                <p className={styles.note}>
                    {locked && available && <LockIcon aria-hidden className={styles.noteIcon} />}
                    {note}
                </p>
            )}

            {failed && (
                <Notify title={t('notify.title.permissions')} severity="error">
                    {t(`${KEY}.saveFailed`)}
                </Notify>
            )}

            {!locked && (
                <div ref={actionsRef} className={styles.actions}>
                    <M3Button variant="filled" disabled={!dirty} loading={saving} onClick={save}>
                        {t(`${KEY}.save`)}
                    </M3Button>
                </div>
            )}
        </section>
    );
};
