import { useTranslation } from 'react-i18next';
import { CardEditable } from '../../../../CardEditable';
import { FormInputField } from '../../../../FormInputField';
import { TranslatableFormField } from '../../../../TranslatableFormField';
import { useSingleTenantData } from '../../../../../hooks/useSingleTenantData';
import { useTenantAdminDataMutation } from '../../../../../hooks/useTenantAdminDataMutation.hook';

export const NameAndSlogan = ({ tenantId }: { tenantId: string }) => {
    const { t } = useTranslation();
    const { data, isLoading } = useSingleTenantData({ id: tenantId });
    const { mutate } = useTenantAdminDataMutation({ id: tenantId });

    return (
        <CardEditable
            isLoading={isLoading}
            initialValues={{ ...data }}
            titleKey="organisations.nameAndSlugTitle"
            onSave={mutate}
            tooltip={t('settings.name.help')}
            subTitle={t<string>('organisations.nameAndSlugTitleSubtitle')}
        >
            <FormInputField name="name" labelKey="organisation.name" placeholderKey="slogan" required />

            <TranslatableFormField name={['content', 'claim']}>
                <FormInputField labelKey="organisation.claim" placeholderKey="subSlogan" required />
            </TranslatableFormField>
        </CardEditable>
    );
};
