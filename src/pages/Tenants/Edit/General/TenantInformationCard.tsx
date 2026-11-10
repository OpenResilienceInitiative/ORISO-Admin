import type { ReactNode } from 'react';
import type { FormInstance } from 'antd';
import type { Rule } from 'antd/es/form';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { CardEditable } from '../../../../components/CardEditable';
import { TraegerFieldSections } from './TraegerFieldSections';
import styles from './styles.module.scss';

type Props = {
    form: FormInstance;
    initialValues: Record<string, unknown>;
    isLoading: boolean;
    shouldShowSubdomainField: boolean;
    requiredRule: Rule;
    onSave: (values: Record<string, any>) => void;
    /** Tile sections shown above the fields (the status card). */
    leading?: ReactNode;
};

/** Which parts the edit tile shows: with the data protection officer (the create dialog has the topic instead). */
const EDIT_SECTIONS = ['general', 'sender', 'description', 'dpo'] as const;

/** The editable Träger tile of the master-data page; its fields are the shared `TraegerFieldSections`. */
export const TenantInformationCard = ({
    form,
    initialValues,
    isLoading,
    shouldShowSubdomainField,
    requiredRule,
    onSave,
    leading,
}: Props) => (
    <CardEditable
        isLoading={isLoading}
        editMode={false}
        titleKey="tenants.add.mainTenantTitle"
        headerIcon={<BusinessOutlinedIcon />}
        variant="dialog"
        editButtonPlacement="footer"
        initialValues={initialValues}
        formProp={form}
        onSave={onSave}
        className={styles.tenantInfoCard}
    >
        <TraegerFieldSections
            subdomain={{ visible: shouldShowSubdomainField, editable: false }}
            requiredRule={requiredRule}
            sections={EDIT_SECTIONS}
            leading={leading}
        />
    </CardEditable>
);
