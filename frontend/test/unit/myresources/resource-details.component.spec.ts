import { NEVER } from 'rxjs';
import { ResourceDetailsComponent } from '../../../src/app/myresources/resourcedetails/resource-details.component';
import { IWhoisObjectModel } from '../../../src/app/shared/whois-response-type.model';

describe('ResourceDetailsComponent', () => {
    it('preserves sponsoring-org in the PUT when another attribute is edited', () => {
        const attributes = [
            { name: 'inetnum', value: '192.0.2.0 - 192.0.2.255' },
            { name: 'sponsoring-org', value: 'ORG-EXAMPLE' },
            { name: 'remarks', value: 'original' },
        ];
        const whoisObject = {
            type: 'inetnum',
            source: { id: 'TEST' },
            'primary-key': { attribute: [{ name: 'inetnum', value: '192.0.2.0 - 192.0.2.255' }] },
            attributes: { attribute: attributes },
        } as IWhoisObjectModel;
        const editedObject = {
            ...whoisObject,
            attributes: {
                attribute: attributes.map((attribute) =>
                    attribute.name === 'remarks' ? { ...attribute, value: 'updated' } : { ...attribute },
                ),
            },
        } as IWhoisObjectModel;
        const component = Object.create(ResourceDetailsComponent.prototype) as ResourceDetailsComponent;
        const restService = jasmine.createSpyObj('RestService', ['modifyObject']);
        restService.modifyObject.and.returnValue(NEVER);
        spyOn(window, 'setTimeout').and.stub();

        Object.assign(component as any, {
            alertsService: { clearAlertMessages: jasmine.createSpy('clearAlertMessages') },
            overrideCredentialsService: { getOverrideForRestCall: jasmine.createSpy('getOverrideForRestCall') },
            restService,
            whoisObject,
            show: { viewer: true, editor: false },
        });
        component.source = 'TEST';
        component.objectType = 'inetnum';

        component.updateButtonClicked(editedObject);

        const outgoingPut = restService.modifyObject.calls.mostRecent().args[3];
        expect(outgoingPut.objects.object[0].attributes.attribute).toEqual(
            jasmine.arrayContaining([
                { name: 'sponsoring-org', value: 'ORG-EXAMPLE' },
                { name: 'remarks', value: 'updated' },
            ]),
        );
    });
});
