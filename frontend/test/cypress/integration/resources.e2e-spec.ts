import { ResourcesOverViewPage, ResourcesPage } from '../pages/resources.page';

const user = {
    uuid: '8ffe29be-89ef-41c8-ba7f-0e1553a623e5',
    name: 'ANRR Test User',
    displayName: 'ANRR Test User',
    email: 'anrr-test@example.com',
};

const organisations = [
    { orgObjectId: 'ORG-ANRR-ONE', organisationName: 'ANRR One', roles: ['editor'] },
    { orgObjectId: 'ORG-ANRR-TWO', organisationName: 'ANRR Two', roles: ['editor'] },
];

type TestResource = { resource: string; type: string; status?: string; netname?: string; asname?: string };

const inventory: Record<string, Record<string, TestResource[]>> = {
    'ORG-ANRR-ONE': {
        inetnum: [{ resource: '192.0.2.0 - 192.0.2.255', type: 'inetnum', status: 'ASSIGNED PI', netname: 'ANRR-V4' }],
        inet6num: [{ resource: '2001:db8::/32', type: 'inet6num', status: 'ALLOCATED-BY-RIR', netname: 'ANRR-V6' }],
        'aut-num': [{ resource: 'AS65000', type: 'aut-num', status: 'ASSIGNED', asname: 'ANRR-AS' }],
    },
    'ORG-ANRR-TWO': {
        inetnum: [{ resource: '198.51.100.0 - 198.51.100.255', type: 'inetnum', status: 'ASSIGNED PI', netname: 'ANRR-OTHER' }],
        inet6num: [],
        'aut-num': [],
    },
};

const detailKey = '192.0.2.0 - 192.0.2.255';
const detailObject = {
    type: 'inetnum',
    source: { id: 'TEST' },
    'primary-key': { attribute: [{ name: 'inetnum', value: detailKey }] },
    attributes: {
        attribute: [
            { name: 'inetnum', value: detailKey },
            { name: 'netname', value: 'ANRR-V4' },
            { name: 'org', value: 'ORG-ANRR-ONE' },
            { name: 'sponsoring-org', value: 'ORG-EXAMPLE' },
            { name: 'remarks', value: 'original' },
            { name: 'source', value: 'TEST' },
        ],
    },
};

function stubAccountAndWhois() {
    cy.intercept('GET', '**/api/user-oidc/me', { statusCode: 200, body: user }).as('oidcIdentity');
    cy.intercept('GET', '**/api/user/info', { statusCode: 200, body: { user, organisations } }).as('accountContext');
    cy.intercept('GET', '**/api/user/mntners', { statusCode: 200, body: [] });
    cy.intercept('GET', '**/api/user/resources*', (request) => {
        const orgId = String(request.query['org-id']);
        const type = String(request.query.type);
        const resources = inventory[orgId]?.[type] ?? [];
        request.reply({ statusCode: 200, body: { resources, totalNumberOfResources: resources.length, filteredSize: resources.length } });
    }).as('resourceInventory');
    cy.intercept('GET', '**/api/whois/search*', (request) => {
        const isDetailLookup = String(request.query['query-string']) === detailKey && request.query.flags === 'B';
        if (isDetailLookup) {
            request.reply({ statusCode: 200, body: { objects: { object: [detailObject] } } });
            return;
        }
        request.reply({ statusCode: 200, body: { objects: { object: [] } } });
    }).as('publicWhois');
}

describe('ANRR My Resources', () => {
    let resourcesPage: ResourcesOverViewPage;

    beforeEach(() => {
        stubAccountAndWhois();
        resourcesPage = new ResourcesPage().visitOverview();
        cy.wait('@oidcIdentity');
        cy.wait('@accountContext');
        cy.wait('@resourceInventory');
    });

    it('limits organisation selection to account mappings and switches inventory by organisation', () => {
        resourcesPage.clickOnOrganizationSelector().expectNumberOfOrganizations(2);
        resourcesPage.expectOrganizationToContain(0, 'ANRR One').expectOrganizationToContain(1, 'ANRR Two');
        cy.get('#organisation-selector .ng-dropdown-panel .ng-option:contains("ANRR Two")').click({ force: true });

        cy.wait('@resourceInventory').then(({ request }) => {
            expect(request.query['org-id']).to.equal('ORG-ANRR-TWO');
        });
        resourcesPage.expectResourcesSize(1).expectResourcesToContainText(0, '198.51.100.0/24');
        cy.get('body').should('not.contain.text', '192.0.2.0/24');
    });

    it('shows IPv4, IPv6, and ASN inventory from the selected organisation', () => {
        resourcesPage.expectResourcesSize(1).expectResourcesToContainText(0, '192.0.2.0/24');

        resourcesPage.clickOnIPTab('IPv6');
        cy.wait('@resourceInventory').then(({ request }) => expect(request.query.type).to.equal('inet6num'));
        resourcesPage.expectResourcesSize(1).expectResourcesToContainText(0, '2001:db8::/32');

        resourcesPage.clickOnIPTab('ASN');
        cy.wait('@resourceInventory').then(({ request }) => expect(request.query.type).to.equal('aut-num'));
        resourcesPage.expectResourcesSize(1).expectResourcesToContainText(0, 'AS65000');
    });

    it('navigates to the current resource detail URL and reads the object from TEST Whois', () => {
        cy.get('resource-item a.title')
            .should('have.attr', 'href')
            .and('include', '/myresources/detail/inetnum/192.0.2.0%20-%20192.0.2.255')
            .and('not.include', '/false');
        cy.get('resource-item a.title').click();

        cy.url().should('include', '/myresources/detail/inetnum/192.0.2.0%20-%20192.0.2.255').and('not.include', '/false');
        cy.wait('@publicWhois').then(({ request }) => {
            expect(request.query.source).to.equal('TEST');
            expect(request.query['type-filter']).to.equal('inetnum');
        });
        cy.get('whois-object-viewer').should('contain.text', 'remarks: original').and('not.contain.text', 'sponsoring-org');
    });

    it('navigates to IPv4 creation in source TEST', () => {
        resourcesPage.clickOnCreateAssignmentButton();
        cy.url().should('include', '/webupdates/create/TEST/inetnum');
    });

    it('navigates to IPv6 creation in source TEST', () => {
        resourcesPage.clickOnIPTab('IPv6');
        cy.wait('@resourceInventory');
        resourcesPage.clickOnCreateAssignmentButton();
        cy.url().should('include', '/webupdates/create/TEST/inet6num');
    });

    it('does not expose removed RIPE-only resource products or business fields', () => {
        cy.get('body')
            .should('not.contain.text', 'Sponsored Resources')
            .and('not.contain.text', 'IP Analyser')
            .and('not.contain.text', 'API Keys')
            .and('not.contain.text', 'sponsoring-org')
            .and('not.contain.text', 'LIR');
        cy.get('manage-resources, ip-usage, .resources-ip-usage').should('not.exist');
    });
});
