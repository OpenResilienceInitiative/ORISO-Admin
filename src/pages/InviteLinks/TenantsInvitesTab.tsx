import { Button, Form, Input, Select, Table } from 'antd';
import { useTranslation } from 'react-i18next';
import { MOCK_TENANT_INVITE_LINKS } from './mockData';
import { TenantInviteLinkRow } from './types';
import { StatusTag } from './components/StatusTag';
import styles from './styles.module.scss';

const TENANT_OPTIONS = [
    { value: 1, label: 'Caritas Berlin' },
    { value: 2, label: 'Caritas München' },
];

const AGENCY_OPTIONS = [
    { value: 1, label: '10115 Zentrum Mitte' },
    { value: 2, label: '80331 Innenstadt' },
];

export const TenantsInvitesTab = () => {
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
            title: t('inviteLinks.form.tenant', 'Tenant'),
            dataIndex: 'tenant',
            key: 'tenant',
        },
        {
            title: t('inviteLinks.form.agency', 'Agency'),
            dataIndex: 'agency',
            key: 'agency',
        },
        {
            title: t('inviteLinks.col.status', 'Status'),
            dataIndex: 'status',
            key: 'status',
            render: (status: TenantInviteLinkRow['status']) => <StatusTag status={status} />,
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
                initialValues={{ expiresInDays: '30' }}
                onFinish={() => undefined}
            >
                <div className={styles.formFields}>
                    <Form.Item
                        name="tenantId"
                        label={t('inviteLinks.form.tenant', 'Tenant')}
                        rules={[{ required: true, message: t('plsSelect') }]}
                    >
                        <Select
                            style={{ minWidth: 200 }}
                            placeholder={t('inviteLinks.form.tenantPh', 'Select tenant')}
                            options={TENANT_OPTIONS}
                            allowClear
                        />
                    </Form.Item>
                    <Form.Item
                        name="agencyId"
                        label={t('inviteLinks.form.agency', 'Agency')}
                        rules={[{ required: true, message: t('plsSelect') }]}
                    >
                        <Select
                            style={{ minWidth: 240 }}
                            placeholder={t('inviteLinks.form.agencyPh', 'Select agency')}
                            options={AGENCY_OPTIONS}
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
                dataSource={MOCK_TENANT_INVITE_LINKS}
                pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '30'] }}
            />
        </>
    );
};
