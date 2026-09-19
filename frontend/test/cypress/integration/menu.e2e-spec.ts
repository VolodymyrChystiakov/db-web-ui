import { MenuPage } from '../pages/menu.page';

describe('The menu and sidebar', () => {
    const menuPage = new MenuPage();

    it('shows the ANRR registry navigation', () => {
        menuPage.visit();
        menuPage
            .expectSidebarMenuSize(4)
            .expectSidebarMenuItem(1, 'Query Database')
            .expectSidebarMenuItem(2, 'Full Text Search')
            .expectSidebarMenuItem(3, 'Syncupdates')
            .expectSidebarMenuItem(4, 'Create an Object');

        cy.get('ripe-unified-layout main nav ul:nth-child(1)').should('not.contain.text', 'API Keys').and('not.contain.text', 'IP Analyser');
    });

    it('shows only Overview in the ANRR Resources navigation', () => {
        menuPage.visit('/myresources/overview');
        menuPage.expectSidebarMenuSize(1).expectSidebarMenuItem(1, 'Overview');

        cy.get('ripe-unified-layout main nav ul:nth-child(1)')
            .should('not.contain.text', 'Sponsored Resources')
            .and('not.contain.text', 'IP Analyser')
            .and('not.contain.text', 'API Keys');
    });

    it('keeps the generic registry navigation available', () => {
        menuPage
            .visit()
            .clickSidebarMenuItem('Full Text Search')
            .expectPage('fulltextsearch')
            .clickSidebarMenuItem('Syncupdates')
            .expectPage('syncupdates')
            .clickSidebarMenuItem('Create an Object')
            .expectPage('webupdates/select')
            .clickSidebarMenuItem('Query Database')
            .expectPage('query');
    });
});
