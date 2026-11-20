import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import { CardEditable } from '../../../../../components/CardEditable';
import { TileSections } from '../../../../../components/TileSections';
import { AgencyGeneralInformation } from '../GeneralInformation';
import { OpenDepartmentFieldOnRequest } from '../DepartmentDetails/OpenDepartmentFieldOnRequest';
import { RegistrationSettings } from '../RegistrationSettings';
import { AgencySettings } from '../AgencySettings';

/** Two field columns fit a half-width panel on a 1440px screen. */
const FIELD_COLUMN_MIN = 240;

interface AgencyMasterDataTileProps {
    initialValues: Record<string, unknown>;
    onSave: <T>(formData: T, options?: { onError?: () => void }) => void;
    /** Counts up each time the Fachbereich tile asks for the department field to open. */
    departmentFieldRequest: number;
    persistedTeamAgency: boolean;
    /** The confirmed status of the centre; sits as a wide panel on top, outside the form fields. */
    status?: ReactNode;
}

/**
 * The Beratungsstelle's master data as one tile. Its three topics sit side by side as white
 * panels (like "Sonstige Funktionen" on the Träger level) and are edited and saved together,
 * through the same `onSave` the three separate cards used.
 */
export const AgencyMasterDataTile = ({
    initialValues,
    onSave,
    departmentFieldRequest,
    persistedTeamAgency,
    status,
}: AgencyMasterDataTileProps) => {
    const { t } = useTranslation();

    return (
        <CardEditable
            allowUnsavedChanges
            initialValues={initialValues}
            titleKey="agency.edit.settings.general.title"
            headerIcon={<HomeWorkOutlinedIcon />}
            variant="dialog"
            autoHeight
            editButtonPlacement="footer"
            onSave={onSave}
        >
            {({ form, editing, startEditing }) => (
                <>
                    <OpenDepartmentFieldOnRequest
                        request={departmentFieldRequest}
                        startEditing={startEditing}
                        form={form}
                    />
                    <TileSections>
                        {status && (
                            <TileSections.Section wide id="agency-status" title={t('entityStatus.title')}>
                                {status}
                            </TileSections.Section>
                        )}
                        <TileSections.Section id="agency-general" title={t('agency.edit.general.general_information')}>
                            <AgencyGeneralInformation asFields minColumnWidth={FIELD_COLUMN_MIN} />
                        </TileSections.Section>
                        <TileSections.Stack>
                            <TileSections.Section
                                id="agency-registration"
                                title={t('agency.form.registrationSettings.title')}
                            >
                                <RegistrationSettings asFields editing={editing} />
                            </TileSections.Section>
                            <TileSections.Section id="agency-offer" title={t('agency.edit.settings.title')}>
                                <AgencySettings isEditMode asFields persistedTeamAgency={persistedTeamAgency} />
                            </TileSections.Section>
                        </TileSections.Stack>
                    </TileSections>
                </>
            )}
        </CardEditable>
    );
};
