import type { Rule } from 'antd/es/form';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getDomain } from '../../../../utils/getDomain';
import { TileSections } from '../../../../components/TileSections';
import { MuiFormField, MuiMultilineFormField, MuiNumberFormField } from '../../../../components/mui/MuiFormField';
import { TraegerSenderFields } from '../../../../components/Tenants/TraegerSenderFields';
import { TraegerDpoFields } from '../../../../components/Tenants/TraegerDpoFields';
import styles from './styles.module.scss';

/** One field per row, all with the same rhythm; the sections add the space between their parts. */
const wrapInFieldGroup = (field: ReactNode, name: string) => (
    <div key={name} className={styles.fieldGroup}>
        {field}
    </div>
);

/**
 * The sections of the Träger tile. The list names the parts and the order of the short ones in their column;
 * the general panel, the data protection officer and extra children keep their place in the page.
 */
export const TRAEGER_SECTION_ORDER = ['general', 'sender', 'description', 'dpo', 'topic'] as const;
export type TraegerSectionKey = (typeof TRAEGER_SECTION_ORDER)[number];

const STACKED: readonly TraegerSectionKey[] = ['sender', 'description', 'topic'];

interface TraegerFieldSectionsProps {
    /** The subdomain is hidden on a single-domain platform; it is read-only once the Träger exists. */
    subdomain: { visible: boolean; editable: boolean; rules?: Rule[] };
    requiredRule: Rule;
    /** Which sections to show; the edit tile has the data protection officer, the create dialog the topic. */
    sections: readonly TraegerSectionKey[];
    /** Extra sections after the Träger's own ones, e.g. the first admin in the create dialog. */
    children?: ReactNode;
}

/** The fields of a Träger as white panels: the same look for the edit tile and the create dialog. */
export const TraegerFieldSections = ({ subdomain, requiredRule, sections, children }: TraegerFieldSectionsProps) => {
    const { t } = useTranslation();
    const parts: Record<TraegerSectionKey, ReactNode> = {
        general: (
            <TileSections.Section key="general" id="traeger-general" title={t('tenants.form.section.general')}>
                <div className={styles.fields}>
                    <div className={styles.fieldGroup}>
                        <MuiFormField
                            name="name"
                            label={t('tenants.add.form.name.placeholder')}
                            required
                            rules={[requiredRule]}
                        />
                    </div>
                    {subdomain.visible && (
                        <div className={styles.fieldGroup}>
                            <MuiFormField
                                name="subdomain"
                                label={t('tenants.add.form.subdomain.placeholder')}
                                required={subdomain.editable}
                                disabled={!subdomain.editable}
                                rules={subdomain.editable ? [requiredRule, ...(subdomain.rules ?? [])] : undefined}
                                endAdornment={<span className={styles.domainSuffix}>.{getDomain()}</span>}
                            />
                        </div>
                    )}
                    <div className={styles.fieldGroup}>
                        <MuiNumberFormField
                            name={['licensing', 'allowedNumberOfUsers']}
                            label={t('tenants.add.form.allowedConsultantsLicense.placeholder')}
                            required
                            min={1}
                            rules={[requiredRule]}
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <MuiFormField
                            name="address"
                            label={t('tenants.add.form.address.label')}
                            placeholder={t('tenants.add.form.address.placeholder')}
                        />
                    </div>
                </div>
            </TileSections.Section>
        ),
        sender: (
            <TileSections.Section key="sender" id="traeger-sender" title={t('tenants.form.section.sender')}>
                <div className={styles.fields}>
                    <TraegerSenderFields wrapField={wrapInFieldGroup} />
                </div>
            </TileSections.Section>
        ),
        description: (
            <TileSections.Section
                key="description"
                id="traeger-description"
                title={t('tenants.add.form.description.label')}
            >
                <div className={styles.fields}>
                    <div className={styles.fieldGroup}>
                        <MuiMultilineFormField
                            name="description"
                            label={t('tenants.add.form.description.label')}
                            placeholder={t('tenants.add.form.description.placeholder')}
                        />
                    </div>
                </div>
            </TileSections.Section>
        ),
        topic: (
            <TileSections.Section key="topic" id="traeger-topic" title={t('tenants.add.form.topic.label')}>
                <div className={styles.fields}>
                    <div className={styles.fieldGroup}>
                        <MuiFormField
                            name="topic"
                            label={t('tenants.add.form.topic.label')}
                            placeholder={t('tenants.add.form.topic.placeholder')}
                            helpText={t('tenants.add.form.topic.info')}
                        />
                    </div>
                </div>
            </TileSections.Section>
        ),
        dpo: (
            <TileSections.Section
                key="dpo"
                id="traeger-dpo"
                title={t('tenants.form.dpo.title')}
                note={t('tenants.form.dpo.help')}
            >
                <div className={styles.fields}>
                    <TraegerDpoFields wrapField={wrapInFieldGroup} showHeading={false} />
                </div>
            </TileSections.Section>
        ),
    };

    const shown = TRAEGER_SECTION_ORDER.filter((key) => sections.includes(key));
    const stacked = shown.filter((key) => STACKED.includes(key));

    return (
        <TileSections>
            {shown.includes('general') && parts.general}
            {/* The short parts share one column, so a panel is not left with half of its height empty. */}
            <TileSections.Stack keepColumn>{stacked.map((key) => parts[key])}</TileSections.Stack>
            {shown.includes('dpo') && parts.dpo}
            {children}
        </TileSections>
    );
};
