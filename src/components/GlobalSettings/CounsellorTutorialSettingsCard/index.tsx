import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import { Form } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../Card';
import { MuiSwitchField } from '../../mui/MuiSwitchField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import styles from './styles.module.scss';

interface Props {
    toursEnabled?: boolean;
    practiceEnabled?: boolean;
}

/** Read-only preview: no central configuration or new-account-default save contract exists yet. */
export const CounsellorTutorialSettingsCard = ({ toursEnabled, practiceEnabled }: Props) => {
    const { t } = useTranslation();
    const availability = (enabled?: boolean) => {
        if (enabled === undefined) return t('globalSettings.tutorials.status.unknown');
        return t(`globalSettings.tutorials.status.${enabled ? 'on' : 'off'}`);
    };
    let practiceAvailable: boolean | undefined;
    if (toursEnabled === false || practiceEnabled === false) practiceAvailable = false;
    else if (toursEnabled === true && practiceEnabled === true) practiceAvailable = true;

    return (
        <Card
            className={styles.card}
            variant="dialog"
            autoHeight
            dialogContentPadding
            headerIcon={<ExploreOutlinedIcon />}
            titleKey="globalSettings.tutorials.title"
            subTitleKey="globalSettings.tutorials.description"
        >
            <div className={styles.content}>
                <section aria-label={t('globalSettings.tutorials.current')}>
                    <h6 className={styles.heading}>{t('globalSettings.tutorials.current')}</h6>
                    <dl className={styles.availability}>
                        <div>
                            <dt>{t('globalSettings.tutorials.tours')}</dt>
                            <dd>{availability(toursEnabled)}</dd>
                        </div>
                        <div>
                            <dt>{t('globalSettings.tutorials.practice')}</dt>
                            <dd>{availability(practiceAvailable)}</dd>
                        </div>
                    </dl>
                </section>
                <section aria-label={t('globalSettings.tutorials.planned')}>
                    <h6 className={styles.heading}>{t('globalSettings.tutorials.planned')}</h6>
                    <p className={styles.notice}>{t('globalSettings.tutorials.comingSoon')}</p>
                    <p className={styles.description}>{t('globalSettings.tutorials.previewHelp')}</p>
                    <Form
                        layout="vertical"
                        disabled
                        className={styles.controls}
                        fields={[
                            { name: 'tours', value: toursEnabled === true },
                            { name: 'practice', value: practiceEnabled === true },
                            { name: 'newAccountDefault', value: false },
                            { name: 'individualTours', value: false },
                        ]}
                    >
                        <MuiSwitchField
                            name="tours"
                            label={t('globalSettings.tutorials.showTours')}
                            helpText={t('globalSettings.tutorials.showToursHelp')}
                            disabled
                        />
                        <MuiSwitchField
                            name="practice"
                            label={t('globalSettings.tutorials.enablePractice')}
                            helpText={t('globalSettings.tutorials.enablePracticeHelp')}
                            disabled
                        />
                        <MuiSwitchField
                            name="newAccountDefault"
                            label={t('globalSettings.tutorials.newAccountDefault')}
                            helpText={t('globalSettings.tutorials.newAccountDefaultHelp')}
                            disabled
                        />
                        <MuiSwitchField
                            name="individualTours"
                            label={t('globalSettings.tutorials.individualTours')}
                            helpText={t('globalSettings.tutorials.individualToursHelp')}
                            disabled
                        />
                    </Form>
                </section>
            </div>
        </Card>
    );
};

export const CounsellorTutorialSettingsCardContainer = () => {
    const { settings } = useAppConfigContext();
    const practiceFlag: unknown = settings.releaseToggles?.enablePracticeArea;
    // The public service can supply textual release flags; match the Frontend's exact true value.
    let practiceEnabled: boolean | undefined;
    if (practiceFlag === true || practiceFlag === 'true') practiceEnabled = true;
    else if (practiceFlag === false || practiceFlag === 'false') practiceEnabled = false;
    return (
        <CounsellorTutorialSettingsCard
            toursEnabled={typeof settings.enableWalkthrough === 'boolean' ? settings.enableWalkthrough : undefined}
            practiceEnabled={practiceEnabled}
        />
    );
};
