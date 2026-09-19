import { ChangeDetectionStrategy, Component, Input, OnChanges, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgbDropdown, NgbDropdownMenu, NgbDropdownToggle } from '@ng-bootstrap/ng-bootstrap';
import { NameFormatterComponent } from '../../shared/name-formatter.component';
import { UserInfoService } from '../../userinfo/user-info.service';
import { IResourceModel } from '../resource-type.model';
import { HierarchySelectorService } from './hierarchy-selector.service';

@Component({
    selector: 'hierarchy-selector',
    templateUrl: './hierarchy-selector.component.html',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NameFormatterComponent],
})
export class HierarchySelectorComponent implements OnChanges {
    private hierarchySelectorService = inject(HierarchySelectorService);
    private userInfoService = inject(UserInfoService);
    private router = inject(Router);

    public parents: string[];
    @Input()
    public resource: IResourceModel;

    public ngOnChanges() {
        if (!this.resource || ['inetnum', 'inet6num'].indexOf(this.resource.type) < 0) {
            return;
        }

        this.userInfoService.getSelectedOrganisation().subscribe((selOrg: any) => {
            if (selOrg && selOrg.orgObjectId) {
                this.fetchParents(selOrg.orgObjectId);
            }
        });
    }

    public showTopLevelResources() {
        void this.router.navigate(['myresources/overview'], { queryParams: { type: this.resource.type } });
    }

    public takeMeBackHome(parent: string) {
        if (!parent && !(this.parents && this.parents.length)) {
            return this.showTopLevelResources();
        }
        const target = parent ? parent : this.parents[this.parents.length - 1];
        void this.router.navigate(['myresources/detail', this.resource.type, target]);
    }

    private fetchParents(orgId: string): void {
        this.hierarchySelectorService.fetchParentResources(this.resource, orgId).subscribe((resp: string[]) => {
            const parents: string[] = resp;
            this.parents = parents && parents.length < 1 ? [] : parents;
            this.parents.push(this.resource.resource);
        });
    }
}
