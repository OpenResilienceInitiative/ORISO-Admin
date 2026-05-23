import { Button, Form, Input, Select, Table } from 'antd';
import { useTranslation } from 'react-i18next';
import { MOCK_COUNSELLOR_INVITE_LINKS } from './mockData';
import { CounsellorInviteLinkRow } from './types';
import { StatusTag } from './components/StatusTag';
import styles from './styles.module.scss';

const COUNSELLOR_OPTIONS = [
    { value: 1, label: 'Dr. Anna Schmidt' },
    { value: 2, label: 'Thomas Weber' },
];

export const CounsellorInvitesTab = () => {
    const { t } = useTranslation();
    const [form] = Form.useForm();

    const columns = [
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
            title: t('inviteLinks.form.counsellor', 'Counsellor'),
            dataIndex: 'counsellor',
            key: 'counsellor',
        },
        {
            title: t('inviteLinks.col.status', 'Status'),
            dataIndex: 'status',
            key: 'status',
            render: (status: CounsellorInviteLinkRow['status']) => <StatusTag status={status} />,
        },
        {
            title: t('inviteLinks.col.expiresAt', 'Läuft ab'),
            dataIndex: 'expiresAt',
            key: 'expiresAt',
        },
        {
            title: t('inviteLinks.col.usedAt', 'Used'),
            dataIndex: 'usedAt',
            key: 'usedAt',
            render: (value: string | null) => value || '—',
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
    ];

    return (
        <>
            <Form
                form={form}
                className={styles.createForm}
                layout="inline"
                initialValues={{ expiresInDays: 'never' }}
                onFinish={() => undefined}
            >
                <div className={styles.formFields}>
                    <Form.Item
                        name="counsellorId"
                        label={t('inviteLinks.form.counsellor', 'Counsellor')}
                        rules={[{ required: true, message: t('plsSelect') }]}
                    >
                        <Select
                            style={{ minWidth: 240 }}
                            placeholder={t('inviteLinks.form.counsellorPh', 'Select counsellor')}
                            options={COUNSELLOR_OPTIONS}
                            allowClear
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
                dataSource={MOCK_COUNSELLOR_INVITE_LINKS}
                pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '30'] }}
            />
        </>
    );
};
