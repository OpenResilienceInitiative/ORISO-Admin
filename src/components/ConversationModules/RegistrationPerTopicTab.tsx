import { useTranslation } from 'react-i18next';
import { ToggleRow } from '../ToggleRow';
import { M3Button } from '../M3Button';
import {
    registrationSteps,
    resetTopic,
    resolveTopicQuestionnaire,
    setTopicHidden,
    setTopicPostcode,
    type Questionnaire,
    type RegistrationSettings,
    type RegistrationTopic,
} from './registrationQuestionnaire';
import styles from './styles.module.scss';

interface RegistrationPerTopicTabProps {
    settings: RegistrationSettings;
    topics: RegistrationTopic[];
    onChange: (settings: RegistrationSettings) => void;
}

/**
 * ADR-036 part C, first step: per topic, the platform admin switches the postcode on or off and
 * may hide the topic from the normal registration. Without a postcode the advice seeker picks
 * the Beratungsstelle from the topic's list.
 */
export const RegistrationPerTopicTab = ({ settings, topics, onChange }: RegistrationPerTopicTabProps) => {
    const { t } = useTranslation();

    const stepsLine = (questionnaire: Questionnaire) =>
        t('conversationModules.registration.steps', {
            steps: registrationSteps(questionnaire)
                .map((step) => t(`conversationModules.registration.step.${step}`, step))
                .join(' → '),
        });

    return (
        <div className={styles.dialogBody} data-testid="registration-per-topic">
            <p className={styles.intro}>{t('conversationModules.registration.intro')}</p>
            <section className={styles.platformDefault} aria-labelledby="registration-platform-default">
                <h3 id="registration-platform-default" className={styles.topicName}>
                    {t('conversationModules.registration.platformDefault')}
                </h3>
                <ToggleRow
                    label={t('conversationModules.registration.postcode')}
                    checked={settings.platformDefault.postcode}
                    onCheckedChange={(postcode) =>
                        onChange({ ...settings, platformDefault: { ...settings.platformDefault, postcode } })
                    }
                />
                <p className={styles.steps}>{stepsLine(settings.platformDefault)}</p>
            </section>
            <h3 className={styles.topicName}>{t('conversationModules.registration.topics')}</h3>
            <div>
                {topics.map((topic) => {
                    const { source, questionnaire } = resolveTopicQuestionnaire(settings, topic.id);
                    const hidden = (settings.hiddenTopics ?? []).includes(topic.id);
                    return (
                        <div key={topic.id} className={styles.topicRow} data-testid={`registration-topic-${topic.id}`}>
                            <div className={styles.topicHeader}>
                                <h4 className={styles.topicName}>{topic.name}</h4>
                                <span className={styles.chip}>
                                    {t(
                                        source === 'topic'
                                            ? 'conversationModules.registration.own'
                                            : 'conversationModules.registration.inherits',
                                    )}
                                </span>
                            </div>
                            <ToggleRow
                                label={t('conversationModules.registration.postcode')}
                                checked={questionnaire.postcode}
                                description={
                                    questionnaire.postcode
                                        ? undefined
                                        : t('conversationModules.registration.postcodeHelp')
                                }
                                onCheckedChange={(postcode) => onChange(setTopicPostcode(settings, topic.id, postcode))}
                            />
                            <ToggleRow
                                label={t('conversationModules.registration.hidden')}
                                checked={hidden}
                                description={t('conversationModules.registration.hiddenHelp')}
                                onCheckedChange={(next) => onChange(setTopicHidden(settings, topic.id, next))}
                            />
                            <p className={styles.steps}>{stepsLine(questionnaire)}</p>
                            {source === 'topic' && (
                                <div>
                                    <M3Button variant="text" onClick={() => onChange(resetTopic(settings, topic.id))}>
                                        {t('conversationModules.registration.reset')}
                                    </M3Button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <p className={styles.help}>{t('conversationModules.registration.moreLater')}</p>
        </div>
    );
};
