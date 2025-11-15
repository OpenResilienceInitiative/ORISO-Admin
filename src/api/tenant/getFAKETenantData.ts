import { CancelTokenSource } from 'axios';

const imprint =
    '<section class="template">\n' +
    '    <h1>Angaben gemäß § 5 TMG</h1>\n' +
    '    <p>\n' +
    '        MusterTenant GmbH<br><!-- tenant name -->\n' +
    '        Sitz der Gesellschaft:<br><!-- tenant adresse -->\n' +
    '        Musterstraße 14<br>\n' +
    '        11233 Musterbek\n' +
    '    </p>\n' +
    '    <p>\n' +
    '        <a href="mailto:info@Musterwebsite.de">info@Musterwebsite.de</a><!-- tenant email -->\n' +
    '        <a href="tel:+49123456789">Telefon: +49 (0)123456789</a><!-- tenant phone -->\n' +
    '        <span>Fax: +49 (0)123654987</span><!-- tenant fax -->\n' +
    '        <a\n' +
    '            href="http://Musterwebsite.de"\n' +
    '            rel="noopener noreferrer"\n' +
    '            target="_blank"\n' +
    '        >\n' +
    '            www.musterwebsite.de\n' +
    '        </a><!-- tenant website -->\n' +
    '    </p>\n' +
    '\n' +
    '    <p> <!-- tenant legal info -->\n' +
    '        Registergericht: Musterstadt, HRB 12345 MS<br>\n' +
    '        USt-Id: DE123654987\n' +
    '    </p>\n' +
    '    <p>Geschäftsführer: Monika Mustermann</p><!-- tenant CEO -->\n' +
    '\n' +
    '    <h3>Online-Streitbeilegung</h3><!-- more info -->\n' +
    '    <p>Die Europäische Kommission stellt<a\n' +
    '            href="https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home.show&amp;lng=DE" target="_blank"\n' +
    '            rel="noreferrer"><span class="bold primary"> hier </span></a>eine Plattform zur Online-Streitbeilegung\n' +
    '        bereit, die Verbraucher für die Beilegung einer Streitigkeit nutzen können und auf der weitere Informationen zum\n' +
    '        Thema Streitschlichtung zu finden sind.</p>\n' +
    '    <h3>Außergerichtliche Streitbeilegung</h3>\n' +
    '    <p>Wir sind weder verpflichtet noch dazu bereit, im Falle einer Streitigkeit mit einem Verbraucher an einem\n' +
    '        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>\n' +
    '</section>';

/**
 * retrieve all needed tenant data
 * @param tenantId {string}
 * @param cancelTokenSource {CancelTokenSource}
 * @return {Promise<AxiosResponse<any>>}
 */
const getTenantData = (tenantId: number, cancelTokenSource: CancelTokenSource) => {
    const tenantResponse = {
        id: tenantId,
        name: 'Onlineberatung',
        subdomain: 'onlineberatung',
        createDate: '2021-12-29T15:15:09',
        updateDate: '2021-12-29T15:15:09',
        licensing: {
            allowedNumberOfUsers: 3,
        },
        theming: {
            logo: null,
            favicon: null,
            primaryColor: '#ff2563',
            secondaryColor: '#c3e001',
        },
        content: {
            impressum: imprint,
            privacy: 'Datenschutz',
            termsAndConditions: 'Nutzungsbedingungen',
            claim: 'Wir tun was wir können',
        },
    };
    // eslint-disable-next-line no-console
    console.log('FAKE get TenantData', tenantResponse, cancelTokenSource);
    return new Promise((resolve) => {
        window.setTimeout(() => {
            resolve(tenantResponse);
        }, 500);
    });
};

export default getTenantData;
