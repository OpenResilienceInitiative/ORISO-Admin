import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { Card } from '../../../../Card';
import type { CalendarPolicies } from '../../../../../types/permissionPolicy';
import { RecipientScopeControl } from '../RecipientScope/RecipientScopeControl';
import { AskerUsernamesControl } from './AskerUsernamesControl';
import type { CalendarPolicyChange } from './calendarPolicy';
import styles from '../styles.module.scss';

export const CALENDAR_VISIBILITY_SCOPE_KEY = 'tenants.permissions.calendar.visibilityScope';

export type CalendarCardProps = {
    /**
     * The `calendar` block as the API served it. Absent on a backend without it (TenantService#365
     * not deployed): both settings show the default read-only, because a save would be ignored.
     */
    policies?: CalendarPolicies | null;
    level: 'platform' | 'tenant';
    /** Saves one changed policy; rejects when the save fails, and the control keeps the edit. */
    onSave: (change: CalendarPolicyChange) => Promise<unknown>;
};

/**
 * "Kalender" on Settings → Functionality Access (ADR-032): how far counsellors can show their
 * colleagues' calendars, and whether colleagues also see the advice seeker's username. Per Träger,
 * with a platform preset; not on the centre page.
 */
export const CalendarCard = ({ policies, level, onSave }: CalendarCardProps) => {
    // A block from the backend without one of the two policies reads as its default.
    const served = policies != null;
    return (
        <Card
            headerIcon={<CalendarMonthOutlinedIcon />}
            titleKey="tenants.permissions.calendar.title"
            dataTestId="permissions-card-calendar"
        >
            <div className={styles.tileBody}>
                <RecipientScopeControl
                    i18nKey={CALENDAR_VISIBILITY_SCOPE_KEY}
                    testId="calendar-visibility-scope-control"
                    level={level}
                    policy={served ? policies.visibilityScope ?? {} : undefined}
                    onSave={(next) => onSave({ visibilityScope: next })}
                />
                <AskerUsernamesControl
                    level={level}
                    policy={served ? policies.showAskerUsernames ?? {} : undefined}
                    onSave={(next) => onSave({ showAskerUsernames: next })}
                />
            </div>
        </Card>
    );
};
