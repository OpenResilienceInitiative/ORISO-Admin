import { Button, Form, Input, Select, Table } from 'antd';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTenantTopics } from '../../hooks/useTenantTopics';
import { CHAT_TYPE_OPTIONS, MOCK_EXTERNAL_INBOUND_LINKS } from './mockData';
import { ExternalInboundLinkRow } from './types';
import { AnonymityTag, StatusTag } from './components/StatusTag';
import styles from './styles.module.scss';

export const ExternalInboundsTab = () => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const { data: topics = [], isLoading: isLoadingTopics } = useTenantTopics(true);

    const topicOptions = useMemo(
        () => topics.map((topic) => ({ value: topic.id, label: topic.name })),
        [topics],
    );

    const columns = useMemo(
        () => [
            {
                title: t('inviteLinks.col.chatType', 'Chat Type'),
                dataIndex: 'chatType',
                key: 'chatType',
            },
            {
                title: t('inviteLinks.col.topic', 'Topic'),
                dataIndex: 'topic',
                key: 'topic',
            },
            {
                title: t('inviteLinks.col.createdAt', 'Created at'),
                dataIndex: 'createdAt',
                key: 'createdAt',
            },
            {
                title: t('inviteLinks.col.createdBy', 'Erstellt von'),
                dataIndex: 'createdBy',
                key: 'createdBy',
            },
            {
                title: t('inviteLinks.col.notes', 'Notes'),
                dataIndex: 'notes',
                key: 'notes',
                render: (value: string) => value || '—',
            },
            {
                title: t('inviteLinks.col.status', 'Status'),
                dataIndex: 'status',
                key: 'status',
                render: (status: ExternalInboundLinkRow['status']) => <StatusTag status={status} />,
            },
            {
                title: t('inviteLinks.col.expiresAt', 'Läuft ab'),
                dataIndex: 'expiresAt',
                key: 'expiresAt',
            },
            {
                title: t('inviteLinks.col.anonymity', 'Anonymity'),
                dataIndex: 'anonymity',
                key: 'anonymity',
                render: (value: string) => <AnonymityTag value={value} />,
            },
            {
                title: t('inviteLinks.col.link', 'Link'),
                key: 'link',
                render: () => (
                    <Button size="small" className={styles.copyButton} disabled>
                        {t('inviteLinks.copy', 'Kopieren')}
                    </Button>
                ),
            },
        ],
        [t],
    );

    return (
        <>
            <Form
                form={form}
                className={styles.createForm}
                layout="inline"
                initialValues={{ chatType: CHAT_TYPE_OPTIONS[0].value, expiresInDays: 'never' }}
                onFinish={() => undefined}
            >
                <div className={styles.formFields}>
                    <Form.Item
                        name="topicId"
                        label={t('inviteLinks.form.topic', 'Topic')}
                        rules={[{ required: true, message: t('plsSelect') }]}
                    >
                        <Select
                            style={{ minWidth: 200 }}
                            loading={isLoadingTopics}
                            placeholder={t('inviteLinks.form.topicPh', 'Select Topic')}
                            options={topicOptions}
                            allowClear
                        />
                    </Form.Item>
                    <Form.Item
                        name="chatType"
                        label={t('inviteLinks.form.chatType', 'Chat Type')}
                        rules={[{ required: true }]}
                    >
                        <Select
                            style={{ minWidth: 160 }}
                            options={CHAT_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="expiresInDays"
                        label={t('inviteLinks.form.expiresInDays', 'Expires in days')}
                    >
                        <Input style={{ width: 90 }} />
                    </Form.Item>
                </div>
                <Form.Item>
                    <Button type="primary" htmlType="submit" className={styles.createButton}>
                        {t('inviteLinks.createLink', 'Create link')}
                    </Button>
                </Form.Item>
            </Form>

            <Table
                className={styles.linksTable}
                rowKey="id"
                columns={columns}
                dataSource={MOCK_EXTERNAL_INBOUND_LINKS}
                pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '30'] }}
            />
        </>
    );
};
