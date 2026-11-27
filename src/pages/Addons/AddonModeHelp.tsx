import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Button, Popover } from 'antd';
import { useTranslation } from 'react-i18next';
import { ADDON_MODES } from '../../addons/addonTypes';
import styles from './addons.module.scss';

/** An info button that explains what each mode means for the Träger. */
export const AddonModeHelp = () => {
    const { t } = useTranslation();
    return (
        <Popover
            trigger="click"
            placement="bottomLeft"
            content={
                <dl className={styles.modeHelp}>
                    {ADDON_MODES.map((mode) => (
                        <div key={mode}>
                            <dt>{t(`addons.mode.${mode}`)}</dt>
                            <dd>{t(`addons.mode.help.${mode}`)}</dd>
                        </div>
                    ))}
                </dl>
            }
        >
            <Button
                type="text"
                size="small"
                className={styles.modeHelpButton}
                aria-label={String(t('addons.mode.help.open'))}
                icon={<InfoOutlinedIcon fontSize="inherit" aria-hidden />}
            />
        </Popover>
    );
};

export default AddonModeHelp;
