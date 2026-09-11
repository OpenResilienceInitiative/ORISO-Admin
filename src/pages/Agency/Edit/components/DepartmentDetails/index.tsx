import { Alert, Button, notification, Select, Skeleton } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../../../components/Card';
import { CardEditable } from '../../../../../components/CardEditable';
import { FieldGrid } from '../../../../../components/FieldGrid';
import { MuiFormField, MuiMultilineFormField } from '../../../../../components/mui/MuiFormField';
import { useDepartmentDetails } from '../../../../../hooks/useDepartmentDetails.hook';
import { useUpdateDepartmentDetails } from '../../../../../hooks/useUpdateDepartmentDetails.hook';
import { AgencyData } from '../../../../../types/agency';
import { DepartmentDetails } from '../../../../../types/departmentDetails';

export interface DepartmentOption {
    id: number;
    name: string;
}

/** The Beratungsstelle values a department inherits while it has no override of its own. */
export interface InheritedDetails {
    openingHours?: string;
    floorLocation?: string;
}

interface DepartmentDetailsCardProps {
    departments: DepartmentOption[];
    selected?: number;
    onSelect: (topicId: number) => void;
    /** Stored overrides of the selected department (null/undefined member = inherits). */
    initialValues?: DepartmentDetails;
    /** Beratungsstelle values shown as the inherited fallback. */
    inherited: InheritedDetails;
    onSave: (details: DepartmentDetails, options?: { onError?: () => void }) => void;
    isLoading?: boolean;
    isError?: boolean;
    onRetry?: () => void;
}

const TITLE_KEY = 'agency.edit.general.department_details';

/**
 * Per-Fachbereich contact detail overrides (ORISO-Admin#197: "a center may run several
 * Fachbereiche at different floors/areas with different hours"). Presentational card:
 * the container below wires it to `/agencyadmin/agencies/{id}/topics/{topicId}/details`.
 *
 * Inheritance affordance follows the legal-text pattern: only overrides are persisted, an
 * empty field means "inherits from the Beratungsstelle" and shows the inherited value as
 * its placeholder. Editing is blocked (not hidden) while the stored overrides could not be
 * read — otherwise a save could replace real overrides with blanks.
 */
export const DepartmentDetailsCard = ({
    departments,
    selected,
    onSelect,
    initialValues,
    inherited,
    onSave,
    isLoading,
    isError,
    onRetry,
}: DepartmentDetailsCardProps) => {
    const { t } = useTranslation();

    const departmentSelect = (
        <Select
            aria-label={t('agency.legal.department.choose', 'Fachbereich wählen')}
            options={departments.map(({ id, name }) => ({ value: id, label: name }))}
            value={selected}
            onChange={onSelect}
            placeholder={t('agency.legal.department.choose', 'Fachbereich wählen')}
            style={{ minWidth: 220 }}
            disabled={departments.length === 0}
        />
    );

    // Disable-not-hide: an agency without Fachbereiche keeps the card, with a hint instead
    // of the form, so admins learn the capability exists.
    if (departments.length === 0) {
        return (
            <Card autoHeight dialogContentPadding titleKey={TITLE_KEY} variant="dialog" subTitle={departmentSelect}>
                <p>{t('agency.edit.general.department_details.no_departments')}</p>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card autoHeight dialogContentPadding titleKey={TITLE_KEY} variant="dialog" subTitle={departmentSelect}>
                <Skeleton active title={false} paragraph={{ rows: 4 }} />
            </Card>
        );
    }

    // The form must not open on top of unknown state: saving would replace the department's
    // real overrides with whatever the form happens to contain. Same rule as the legal texts.
    if (isError) {
        const selectedName = departments.find(({ id }) => id === selected)?.name ?? '';
        return (
            <Card autoHeight dialogContentPadding titleKey={TITLE_KEY} variant="dialog" subTitle={departmentSelect}>
                <Alert
                    type="error"
                    showIcon
                    message={t('agency.edit.general.department_details.loadError.title')}
                    description={t('agency.legal.department.loadError.text', { name: selectedName })}
                    action={
                        onRetry && (
                            <Button size="small" onClick={onRetry}>
                                {t('agency.legal.department.loadError.retry')}
                            </Button>
                        )
                    }
                />
            </Card>
        );
    }

    const inheritHint = (inheritedValue?: string) =>
        inheritedValue
            ? t('agency.edit.general.department_details.inherits_value', { value: inheritedValue })
            : t('agency.edit.general.department_details.inherit_hint');

    return (
        <CardEditable
            allowUnsavedChanges
            initialValues={{
                openingHours: initialValues?.openingHours ?? '',
                phoneExtension: initialValues?.phoneExtension ?? '',
                floorLocation: initialValues?.floorLocation ?? '',
            }}
            titleKey={TITLE_KEY}
            subTitle={departmentSelect}
            variant="dialog"
            editButtonPlacement="footer"
            onSave={onSave}
        >
            <FieldGrid>
                <FieldGrid.Wide>
                    <MuiMultilineFormField
                        name="openingHours"
                        label={t('agency.edit.general.address.opening_hours')}
                        placeholder={inherited.openingHours || t('agency.edit.general.address.opening_hours')}
                        helpText={inheritHint(inherited.openingHours)}
                        inputProps={{ maxLength: 1000 }}
                    />
                </FieldGrid.Wide>
                <MuiFormField
                    name="phoneExtension"
                    label={t('agency.edit.general.department_details.phone_extension')}
                    placeholder={t('agency.edit.general.department_details.phone_extension')}
                    helpText={t('agency.edit.general.department_details.phone_extension_hint')}
                    inputProps={{ maxLength: 50 }}
                />
                <MuiFormField
                    name="floorLocation"
                    label={t('agency.edit.general.department_details.floor_location')}
                    placeholder={inherited.floorLocation || t('agency.edit.general.department_details.floor_location')}
                    helpText={inheritHint(inherited.floorLocation)}
                    inputProps={{ maxLength: 100 }}
                />
            </FieldGrid>
        </CardEditable>
    );
};

interface AgencyDepartmentDetailsProps {
    agencyData?: AgencyData;
}

/**
 * Container: selects the Fachbereich, loads its stored overrides and persists edits via
 * PUT /agencyadmin/agencies/{agencyId}/topics/{topicId}/details. Only overrides are sent;
 * cleared fields are stored as null so the department inherits the Beratungsstelle value again.
 */
export const AgencyDepartmentDetails = ({ agencyData }: AgencyDepartmentDetailsProps) => {
    const { t } = useTranslation();
    const agencyId = Number(agencyData?.id);

    const departments = useMemo(
        () =>
            (agencyData?.topics || [])
                .filter((topic) => topic.id != null)
                .map((topic) => ({ id: topic.id as number, name: topic.name })),
        [agencyData?.topics],
    );

    const [selected, setSelected] = useState<number | undefined>(departments[0]?.id);
    const effectiveSelected = selected ?? departments[0]?.id;

    const detailsQuery = useDepartmentDetails(agencyId, effectiveSelected ?? NaN);
    const updateDetails = useUpdateDepartmentDetails(agencyId, effectiveSelected ?? NaN);

    const onSave = (details: DepartmentDetails, options?: { onError?: () => void }) => {
        updateDetails.mutate(details, {
            onError: () => options?.onError?.(),
            onSuccess: () => {
                notification.success({ message: t('message.success.setting.update'), duration: 3 });
            },
        });
    };

    return (
        <DepartmentDetailsCard
            // Remount when the department or its freshly loaded data changes, so the antd
            // form's initialValues actually re-apply (uncontrolled otherwise).
            key={`${effectiveSelected}-${detailsQuery.dataUpdatedAt}`}
            departments={departments}
            selected={effectiveSelected}
            onSelect={setSelected}
            initialValues={detailsQuery.data}
            inherited={{
                openingHours: agencyData?.openingHours || undefined,
                floorLocation: agencyData?.floorBuilding || undefined,
            }}
            onSave={onSave}
            isLoading={detailsQuery.isLoading}
            isError={detailsQuery.isError}
            onRetry={() => detailsQuery.refetch()}
        />
    );
};
