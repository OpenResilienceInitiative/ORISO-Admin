import { useTranslation } from 'react-i18next';
import { snackbar } from '../../../components/Snackbar';
import { CardEditable } from '../../../components/CardEditable';
import { FormInputField } from '../../../components/FormInputField';
import { useUpdateUserData } from '../../../hooks/useUpdateUserData.hook';
import { useUserData } from '../../../hooks/useUserData.hook';
import { TilePicture } from '../../../components/TileFill';
import masterDataPicture from '../../../resources/img/tile-help/master-data.webp';
import { ReactComponent as PersonIcon } from '../../../resources/img/svg/person.svg';

export const PrivateData = () => {
    const { t } = useTranslation();
    const { data, isLoading } = useUserData();
    const { mutate: updateData } = useUpdateUserData({
        onSuccess: () => {
            snackbar.success({ message: t('profile.privateData.success') });
        },
    });

    return (
        <CardEditable
            isLoading={isLoading}
            titleKey="profile.privateData.title"
            headerIcon={<PersonIcon />}
            picture={<TilePicture src={masterDataPicture} />}
            initialValues={{ ...data, firstname: data?.firstName, lastname: data?.lastName }}
            onSave={updateData}
        >
            <FormInputField name="firstname" labelKey="firstname" placeholderKey="placeholder.firstname" required />
            <FormInputField name="lastname" labelKey="lastname" placeholderKey="placeholder.lastname" required />
            <FormInputField name="email" labelKey="email" placeholderKey="placeholder.email" required />
        </CardEditable>
    );
};
