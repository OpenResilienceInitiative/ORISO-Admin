import { List, Modal, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../Card';
import { EditButton } from '../../../EditButton';
import { DEFAULT_TOPICS, DefaultTopic } from './defaultTopics';

const LANGUAGES = ['de', 'en', 'tr'] as const;
type TopicLanguage = (typeof LANGUAGES)[number];

export const TopicsSettings = () => {
    const { t, i18n } = useTranslation();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
            cardTitleChildren={
                <EditButton labelKey="tenants.appSettings.topics.edit" onClick={() => setIsEditModalOpen(true)} />
            }
        >
            <List
                size="small"
                dataSource={DEFAULT_TOPICS}
                rowKey={(topic) => topic.slug}
                renderItem={(topic) => (
                    <List.Item
                        extra={
                            <Tag color={topic.status === 'ACTIVE' ? 'green' : 'default'}>
                                {t(
                                    topic.status === 'ACTIVE'
                                        ? 'tenants.appSettings.topics.status.active'
                                        : 'tenants.appSettings.topics.status.inactive',
                                )}
                            </Tag>
                        }
                    >
                        <List.Item.Meta
                            title={primaryTranslation(topic).title}
                            description={
                                <>
                                    <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
                                        {primaryTranslation(topic).description}
                                    </Typography.Paragraph>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                        {otherLanguageTitles(topic)}
                                    </Typography.Text>
                                </>
                            }
                        />
                    </List.Item>
                )}
            />
            <Modal
                title={t('tenants.appSettings.topics.comingSoon.title')}
                open={isEditModalOpen}
                onCancel={() => setIsEditModalOpen(false)}
                footer={null}
            >
                <Typography.Paragraph>{t('tenants.appSettings.topics.comingSoon.text')}</Typography.Paragraph>
            </Modal>
        </Card>
    );
};
