/**
 * retrieve all needed tenant data
 * @return data
 */

const getFakeMultipleTenants = () => {
    const tenantResponse: any[] = [];
    const tenant = {
        id: 1,
        name: 'Onlineberatung ',
        subdomain: 'onlineberatung-name-der-onlineberatung',
        createDate: '2021-12-29T15:15:09',
        updateDate: '2021-12-29T15:15:09',
        licensing: {
            allowedNumberOfUsers: 3,
        },
    };

    const alphabet = 'abcdefghijklmnopqrstuvwxyz';

    function randomDate(start: Date, end: Date) {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }

    for (let i = 1; i < 21; i += 1) {
        tenantResponse.push({
            ...tenant,
            id: i + 1,
            name: `${alphabet[Math.floor(Math.random() * alphabet.length)]} ${tenant.name} ${i}`,
            subdomain: `${alphabet[Math.floor(Math.random() * alphabet.length)]} ${tenant.subdomain} ${i}`,
            createDate: randomDate(new Date(2021, 0, 1), new Date()),
            licensing: {
                ...tenant.licensing,
                allowedNumberOfUsers: Math.floor(Math.random() * 20) + 1,
            },
            key: i,
        });
    }

    // eslint-disable-next-line no-console
    console.log('FAKE get TenantData', tenantResponse);
    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve(tenantResponse);
        }, 500);
    });
};

export default getFakeMultipleTenants;
