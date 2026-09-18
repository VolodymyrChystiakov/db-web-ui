import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { UserInfoService } from '../../userinfo/user-info.service';
import { ResourcesComponent } from '../resources.component';

@Component({
    selector: 'landing-page',
    templateUrl: './landing-page.component.html',
    styleUrl: 'landing-page.component.scss',
    standalone: true,
    imports: [ResourcesComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class LandingPageComponent implements OnInit {
    private userInfoService = inject(UserInfoService);

    description: string =
        'View registry resources linked to your selected organisation. Resource data and object details are read from authoritative TEST Whois.\n\nSign in with your Keycloak account to continue.';
    loggedIn: boolean;

    currentHref = `${window.location.origin}/db-web-ui/oauth2/authorization/keycloak?next=${window.location.href}`;

    ngOnInit() {
        this.loggedIn = this.userInfoService.isLoggedIn();
    }
}
