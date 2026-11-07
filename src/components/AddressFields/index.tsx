import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MarkunreadMailboxOutlinedIcon from '@mui/icons-material/MarkunreadMailboxOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import SignpostOutlinedIcon from '@mui/icons-material/SignpostOutlined';
import InputAdornment from '@mui/material/InputAdornment';
import { MuiFormField } from '../mui/MuiFormField';
import styles from './styles.module.scss';

/** Leading icon for a field; shared look for the address block and the department fields. */
export const fieldIcon = (icon: ReactNode) => (
    <InputAdornment position="start" className={styles.icon}>
        {icon}
    </InputAdornment>
);

/**
 * The postal address as one grouped block: street + number, postcode + city, then floor/building
 * and country. Same antd field names, rules and limits as the loose fields it replaces
 * (`street`, `houseNumber`, `postcode`, `city`, `floorBuilding`, `country`), so the agency form
 * data and API payloads are unchanged. Must sit inside an antd Form.
 */
export const AddressFields = () => {
    const { t } = useTranslation();
    const requiredRule = { required: true, message: t('form.errors.required') };

    return (
        <fieldset className={styles.group}>
            <legend className={styles.legend}>
                <LocationOnOutlinedIcon fontSize="small" aria-hidden />
                {t('agency.edit.general.address')}
            </legend>
            <div className={styles.grid}>
                <div className={styles.street}>
                    <MuiFormField
                        name="street"
                        label={t('agency.edit.general.address.street')}
                        placeholder={t('agency.edit.general.address.street')}
                        startAdornment={fieldIcon(<SignpostOutlinedIcon fontSize="small" />)}
                        inputProps={{ maxLength: 255 }}
                    />
                </div>
                <div className={styles.number}>
                    <MuiFormField
                        name="houseNumber"
                        label={t('agency.edit.general.address.house_number')}
                        placeholder={t('agency.edit.general.address.house_number')}
                        inputProps={{ maxLength: 20 }}
                    />
                </div>
                <div className={styles.postcode}>
                    <MuiFormField
                        name="postcode"
                        label={t('agency.edit.general.address.postcode')}
                        placeholder={t('agency.edit.general.address.postcode')}
                        required
                        startAdornment={fieldIcon(<MarkunreadMailboxOutlinedIcon fontSize="small" />)}
                        inputProps={{ maxLength: 5 }}
                        rules={[requiredRule, { min: 5, required: true, message: t('agency.postcode.minimum') }]}
                    />
                </div>
                <div className={styles.city}>
                    <MuiFormField
                        name="city"
                        label={t('agency.edit.general.address.city')}
                        placeholder={t('agency.edit.general.address.city')}
                        required
                        startAdornment={fieldIcon(<LocationCityOutlinedIcon fontSize="small" />)}
                        rules={[requiredRule]}
                    />
                </div>
                <div className={styles.half}>
                    <MuiFormField
                        name="floorBuilding"
                        label={t('agency.edit.general.address.floor_building')}
                        placeholder={t('agency.edit.general.address.floor_building')}
                        startAdornment={fieldIcon(<ApartmentOutlinedIcon fontSize="small" />)}
                        inputProps={{ maxLength: 100 }}
                    />
                </div>
                <div className={styles.half}>
                    <MuiFormField
                        name="country"
                        label={t('agency.edit.general.address.country')}
                        placeholder={t('agency.edit.general.address.country')}
                        startAdornment={fieldIcon(<PublicOutlinedIcon fontSize="small" />)}
                        inputProps={{ maxLength: 100 }}
                    />
                </div>
            </div>
        </fieldset>
    );
};

export default AddressFields;
