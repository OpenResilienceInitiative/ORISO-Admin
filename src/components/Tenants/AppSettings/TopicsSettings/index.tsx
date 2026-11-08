import { List, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../Card';
import { DEFAULT_TOPICS, DefaultTopic } from './defaultTopics';

const LANGUAGES = ['de', 'en', 'tr'] as const;
type TopicLanguage = (typeof LANGUAGES)[number];

export const TopicsSettings = () => {
    const { t, i18n } = useTranslation();

    const uiLanguage: TopicLanguage = i18n.language?.startsWith('de') ? 'de' : 'en';

    const primaryTranslation = (topic: DefaultTopic) => topic.translations[uiLanguage] || topic.translations.de;
    const otherLanguageTitles = (topic: DefaultTopic) =>
        LANGUAGES.filter((language) => language !== uiLanguage)
            .map((language) => `${language.toUpperCase()}: ${topic.translations[language].title}`)
            .join(' · ');

    return (
        <Card
            titleKey="tenants.appSettings.topics.title"
            subTitleKey="tenants.appSettings.topics.description"
            cardTitleChildren={<Tag color="default">{t('tenants.appSettings.topics.readOnly')}</Tag>}
        >
            <Typography.Paragraph type="secondary">
                {t('tenants.appSettings.topics.visibilityNotice')}
            </Typography.Paragraph>
            <List
                size="small"
                dataSource={DEFAULT_TOPICS}
                rowKey={(topic) => topic.slug}
                renderItem={(topic) => (
                    <List.Item
                        extra={
                            <Space direction="vertical" align="end" size={4}>
                                <Tag color={topic.status === 'ACTIVE' ? 'green' : 'default'}>
                                    {t(
                                        topic.status === 'ACTIVE'
                                            ? 'tenants.appSettings.topics.status.active'
                                            : 'tenants.appSettings.topics.status.inactive',
                                    )}
                                </Tag>
                                {topic.standardBaseline ? (
                                    <Tag color="blue">{t('tenants.appSettings.topics.standardBaseline')}</Tag>
                                ) : null}
                                {topic.editingDisabled ? (
                                    <Tag color="default">{t('tenants.appSettings.topics.editingDisabled')}</Tag>
                                ) : null}
                            </Space>
                        }
                    >
                        <List.Item.Meta
                            title={`${topic.sortOrder}. ${primaryTranslation(topic).title}`}
                            description={
                                <>
                                    <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
                                        {primaryTranslation(topic).description}
                                    </Typography.Paragraph>
                                    <Space wrap size={[12, 4]}>
                                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                            {t('tenants.appSettings.topics.topicId')}: {topic.id}
                                        </Typography.Text>
                                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                            {t('tenants.appSettings.topics.displayGroup')}: {topic.displayGroup}
                                        </Typography.Text>
                                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                            {t('tenants.appSettings.topics.sortOrder')}: {topic.sortOrder}
                                        </Typography.Text>
                                    </Space>
                                    <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                        {otherLanguageTitles(topic)}
                                    </Typography.Text>
                                </>
                            }
                        />
                    </List.Item>
                )}
            />
        </Card>
    );
};
