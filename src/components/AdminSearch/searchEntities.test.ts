import { describe, expect, it } from 'vite-plus/test';
import { accountDocs, agencyDocs, departmentDocs, tenantDocs, topicDocs, type EntityLabels } from './searchEntities';
import { prepareIndex, searchIndex } from './searchEngine';

const labels: EntityLabels = {
    tenants: 'Tenants',
    agencies: 'Centres',
    topics: 'Topics',
    departments: 'Departments',
    accounts: 'Accounts',
    accountLists: { consultants: 'Counsellors', 'agency-admins': 'Agency admins', 'tenant-admins': 'Tenant admins' },
};

describe('entity documents', () => {
    it('maps a tenant to its general tab and finds it by subdomain', () => {
        const docs = tenantDocs(
            [
                { id: 3, name: 'Springfield QA', subdomain: 'springfield' },
                { id: null, name: 'broken' },
            ],
            labels,
        );

        expect(docs).toHaveLength(1);
        expect(docs[0].to).toBe('/admin/tenants/3/general');
        expect(searchIndex(prepareIndex(docs), 'springfeld')[0].doc.id).toBe('tenant:3');
        expect(searchIndex(prepareIndex(docs), 'springfield')[0].doc.id).toBe('tenant:3');
    });

    it('derives the departments from the topics of the agencies', () => {
        const rows = [
            { id: 1, name: 'Beratung Nord', city: 'Hamburg', topics: [{ id: 5, name: 'Sucht' }] },
            {
                id: 2,
                name: 'Beratung Süd',
                topics: [
                    { id: 5, name: 'Sucht' },
                    { id: 6, name: 'Schulden' },
                ],
            },
        ];
        const departments = departmentDocs(rows, labels);

        expect(agencyDocs(rows, labels)).toHaveLength(2);
        expect(departments.map((doc) => doc.title).sort()).toEqual(['Schulden', 'Sucht', 'Sucht']);
        // One row per department and agency, so a department shared by two centres lists both.
        expect(departments.filter((doc) => doc.title === 'Sucht').map((doc) => doc.to)).toHaveLength(2);
    });

    it('opens a topic in the editor only for an admin who may edit', () => {
        const rows = [{ id: 9, name: 'Sucht' }];

        expect(topicDocs(rows, labels, true)[0].to).toBe('/admin/topics/9');
        expect(topicDocs(rows, labels, false)[0].to).toBe('/admin/topics');
    });

    it('opens an account in its own list and finds it by e-mail or name', () => {
        const docs = accountDocs(
            [{ id: 'abc', firstname: 'Anna', lastname: 'Müller', email: 'anna@example.org' }, { id: 'nameless' }],
            'consultants',
            labels,
        );
        const index = prepareIndex(docs);

        expect(docs).toHaveLength(1);
        expect(docs[0].to).toBe('/admin/users/consultants/abc');
        expect(searchIndex(index, 'mueller')[0].doc.id).toBe('account:consultants:abc');
        expect(searchIndex(index, 'anna@example')[0].doc.id).toBe('account:consultants:abc');
    });
});
