import { ChangeDetectionStrategy, Component, OnDestroy, ViewEncapsulation, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTab, MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IUserInfoOrganisation } from '../dropdown/org-data-type.model';
import { OrgDropDownSharedService } from '../dropdown/org-drop-down-shared.service';
import { ObjectTypesEnum } from '../query/object-types.enum';
import { LabelPipe } from '../shared/label.pipe';
import { LoadingIndicatorComponent } from '../shared/loadingindicator/loading-indicator.component';
import { UserInfoService } from '../userinfo/user-info.service';
import { AnrrWhoisSearchService } from './anrr-whois-search.service';
import { RefreshComponent } from './refresh/refresh.component';
import { ResourceItemComponent } from './resource-item/resource-item.component';
import { IResourceOverviewResponseModel, IResourceScreenItem } from './resource-type.model';
import { ResourcesDataService } from './resources-data.service';

@Component({
    selector: 'resource-component',
    templateUrl: './resources.component.html',
    styleUrl: './resources.component.scss',
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [LoadingIndicatorComponent, ResourceItemComponent, RefreshComponent, LabelPipe, MatTabGroup, MatTab, MatButtonModule],
})
export class ResourcesComponent implements OnDestroy {
    private resourcesDataService = inject(ResourcesDataService);
    private userInfoService = inject(UserInfoService);
    private orgDropDownSharedService = inject(OrgDropDownSharedService);
    private activatedRoute = inject(ActivatedRoute);
    private router = inject(Router);

    public ipv4Resources: IResourceScreenItem[] = [];
    public ipv6Resources: IResourceScreenItem[] = [];
    public asnResources: IResourceScreenItem[] = [];
    public selectedOrg: IUserInfoOrganisation;
    public loading = false;
    public reason = 'No resources found';
    public fail = false;
    public lastTab: string = ObjectTypesEnum.INETNUM;
    public lastTabIndex = 0;
    private subscriptions: Subscription[] = [];
    private subscriptionFetchResources: Subscription;
    public readonly listOfTabs = [ObjectTypesEnum.INETNUM, ObjectTypesEnum.INET6NUM, ObjectTypesEnum.AUT_NUM];

    constructor() {
        this.subscriptions.push(
            this.orgDropDownSharedService.selectedOrgChanged$.subscribe((selected: IUserInfoOrganisation) => {
                if (this.selectedOrg?.orgObjectId !== selected?.orgObjectId) {
                    this.selectedOrg = selected;
                    this.refreshPage();
                }
            }),
        );
        this.subscriptions.push(this.activatedRoute.queryParams.subscribe(() => this.init()));
    }

    public ngOnDestroy() {
        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
        this.subscriptionFetchResources?.unsubscribe();
    }

    public init() {
        const requestedTab = this.activatedRoute.snapshot.queryParamMap.get('type');
        this.lastTab = this.listOfTabs.includes(requestedTab as any) ? requestedTab : ObjectTypesEnum.INETNUM;
        this.lastTabIndex = this.listOfTabs.indexOf(this.lastTab as any);
        this.refreshPage();
    }

    public tabClicked(event: MatTabChangeEvent) {
        this.lastTab = event.tab.id;
        this.lastTabIndex = event.tab.position;
        void this.router.navigate(['myresources/overview'], { queryParams: { type: this.lastTab } });
    }

    public navigateToCreateAssignments() {
        void this.router.navigate(['webupdates/create', AnrrWhoisSearchService.SOURCE, this.lastTab]);
    }

    public refreshPage() {
        if (!this.selectedOrg) {
            this.userInfoService.getSelectedOrganisation().subscribe((org: IUserInfoOrganisation) => {
                this.selectedOrg = org;
                this.fetchResourcesAndPopulatePage();
            });
            return;
        }
        this.fetchResourcesAndPopulatePage();
    }

    private fetchResourcesAndPopulatePage() {
        this.ipv4Resources = [];
        this.ipv6Resources = [];
        this.asnResources = [];
        this.fail = false;
        if (!this.selectedOrg) {
            return;
        }
        this.subscriptionFetchResources?.unsubscribe();
        this.loading = true;
        this.subscriptionFetchResources = this.resourcesDataService.fetchResources(this.selectedOrg.orgObjectId, this.lastTab).subscribe({
            next: (response: IResourceOverviewResponseModel) => {
                this.loading = false;
                switch (this.lastTab) {
                    case ObjectTypesEnum.INETNUM:
                        this.ipv4Resources = response.resources;
                        break;
                    case ObjectTypesEnum.INET6NUM:
                        this.ipv6Resources = response.resources;
                        break;
                    case ObjectTypesEnum.AUT_NUM:
                        this.asnResources = response.resources;
                        break;
                    default:
                        this.fail = true;
                        this.reason = 'There was a problem reading resources';
                }
            },
            error: () => {
                this.loading = false;
                this.fail = true;
                this.reason = 'There was a problem reading resources';
            },
        });
    }
}
