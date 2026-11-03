import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';
import { Form, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../Card';
import { MuiSwitchField } from '../../mui/MuiSwitchField';
import { useAppConfigContext } from '../../../context/useAppConfig';
import { useSettingsAdminMutation } from '../../../hooks/useSettingsAdminMutation.hook';
import { useUserRoles } from '../../../hooks/useUserRoles.hook';
import styles from './styles.module.scss';

interface Props {
    toursEnabled?: boolean;
    practiceEnabled?: boolean;
    /**
     * Saves the central tours switch (`enableWalkthrough`). Omitted for roles that may not write it:
     * the switch then stays visible but read-only (ORISO rule: never hidden, only disabled).
     */
    onToursChange?: (enabled: boolean) => void;
    /** A save of the tours switch is running. */
    toursSaving?: boolean;
}

/**
 * Admin#1205: the central tours switch saves `enableWalkthrough` (ConsultingTypeService#160/#169).
 * Practice area, the new-account default and single tours have no save contract yet and stay a
 * disabled preview.
 */
export const CounsellorTutorialSettingsCard = ({
    toursEnabled,
    practiceEnabled,
    onToursChange,
    toursSaving = false,
}: Props) => {
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
                    <Form
                        layout="vertical"
                        disabled={!onToursChange || toursSaving}
                        className={styles.toursControl}
                        fields={[{ name: 'tours', value: toursEnabled === true }]}
                        onValuesChange={(changed: { tours?: boolean }) => {
                            if (typeof changed.tours === 'boolean') onToursChange?.(changed.tours);
                        }}
                    >
                        <MuiSwitchField
                            name="tours"
                            label={t('globalSettings.tutorials.showTours')}
                            helpText={t('globalSettings.tutorials.showToursHelp')}
                        />
                    </Form>
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
                            { name: 'practice', value: practiceEnabled === true },
                            { name: 'newAccountDefault', value: false },
                            { name: 'individualTours', value: false },
                        ]}
                    >
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
    const { t } = useTranslation();
    const { settings } = useAppConfigContext();
    const { isSuperAdmin } = useUserRoles();
    const { mutate, isPending, variables } = useSettingsAdminMutation();
    const practiceFlag: unknown = settings.releaseToggles?.enablePracticeArea;
    // The public service can supply textual release flags; match the Frontend's exact true value.
    let practiceEnabled: boolean | undefined;
    if (practiceFlag === true || practiceFlag === 'true') practiceEnabled = true;
    else if (practiceFlag === false || practiceFlag === 'false') practiceEnabled = false;
    const storedTours = typeof settings.enableWalkthrough === 'boolean' ? settings.enableWalkthrough : undefined;
    // While the PATCH runs the switch shows the requested value; on failure it falls back to the stored one.
    const requestedTours = isPending ? (variables as { enableWalkthrough?: boolean } | undefined) : undefined;
    return (
        <CounsellorTutorialSettingsCard
            toursEnabled={requestedTours?.enableWalkthrough ?? storedTours}
            practiceEnabled={practiceEnabled}
            toursSaving={isPending}
            onToursChange={
                isSuperAdmin
                    ? (enableWalkthrough) =>
                          mutate(
                              { enableWalkthrough },
                              {
                                  // The settings PATCH rejects silently (`responseHandling: []`); this is the only failure signal.
                                  onError: () =>
                                      message.error({
                                          content: t('globalSettings.tutorials.error.generic'),
                                          duration: 5,
                                      }),
                              },
                          )
                    : undefined
            }
        />
    );
};
