import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ResourceItemComponent } from '../../../src/app/myresources/resource-item/resource-item.component';
import { FlagComponent } from '../../../src/app/shared/flag/flag.component';

describe('ResourceItemComponent', () => {
    let component: ResourceItemComponent;
    let fixture: ComponentFixture<ResourceItemComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [RouterTestingModule, ResourceItemComponent, FlagComponent] });
        fixture = TestBed.createComponent(ResourceItemComponent);
        component = fixture.componentInstance;
    });

    it('shows only registry attributes supplied by authoritative Whois', () => {
        component.item = { type: 'inetnum', resource: '192.0.2.0 - 192.0.2.255', status: 'ASSIGNED PA', netname: 'ANRR-V4' };
        fixture.detectChanges();
        expect(component.flags.map((flag) => flag.text)).toEqual(['ASSIGNED PA', 'ANRR-V4']);
    });
});
