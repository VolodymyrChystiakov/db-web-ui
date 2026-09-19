import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { IUserInfoOrganisation } from '../../dropdown/org-data-type.model';
import { OrgDropDownSharedService } from '../../dropdown/org-drop-down-shared.service';
import { AlertsService } from '../../shared/alert/alerts.service';
import { FlagComponent, IFlag } from '../../shared/flag/flag.component';
import { LoadingIndicatorComponent } from '../../shared/loadingindicator/loading-indicator.component';
import { NameFormatterComponent } from '../../shared/name-formatter.component';
import { OverrideCredentialsService } from '../../shared/override-credentials-service';
import { WhoisResourcesService } from '../../shared/whois-resources.service';
import { IAttributeModel, IWhoisObjectModel, IWhoisResponseModel } from '../../shared/whois-response-type.model';
import { ITextObject } from '../../updatestext/text-create.component';
import { ModalDeleteObjectComponent } from '../../updatesweb/modal-delete-object.component';
import { PreferenceService } from '../../updatesweb/preference.service';
import { RestService } from '../../updatesweb/rest.service';
import { MaintainersEditorComponent } from '../../whois-object/maintainers-editor.component';
import { WhoisObjectEditorComponent } from '../../whois-object/whois-object-editor.component';
import { WhoisObjectTextEditorComponent } from '../../whois-object/whois-object-text-editor.component';
import { WhoisObjectViewerComponent } from '../../whois-object/whois-object-viewer.component';
import { AnrrWhoisSearchService } from '../anrr-whois-search.service';
import { AssociatedObjectsComponent } from '../associatedobjects/associated-objects.component';
import { HierarchySelectorComponent } from '../hierarchyselector/hierarchy-selector.component';
import { HierarchySelectorService } from '../hierarchyselector/hierarchy-selector.service';
import { MoreSpecificsComponent } from '../morespecifics/more-specifics.component';
import { RefreshComponent } from '../refresh/refresh.component';
import { ResourcesDataService } from '../resources-data.service';

@Component({
    selector: 'resource-details',
    templateUrl: './resource-details.component.html',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        NameFormatterComponent,
        FlagComponent,
        NgClass,
        HierarchySelectorComponent,
        MatButton,
        LoadingIndicatorComponent,
        WhoisObjectViewerComponent,
        MaintainersEditorComponent,
        WhoisObjectEditorComponent,
        WhoisObjectTextEditorComponent,
        RefreshComponent,
        MoreSpecificsComponent,
        AssociatedObjectsComponent,
    ],
})
export class ResourceDetailsComponent implements OnDestroy {
    private modalService = inject(NgbModal);
    private resourcesDataService = inject(ResourcesDataService);
    private hierarchySelectorService = inject(HierarchySelectorService);
    private restService = inject(RestService);
    private orgDropDownSharedService = inject(OrgDropDownSharedService);
    private activatedRoute = inject(ActivatedRoute);
    private overrideCredentialsService = inject(OverrideCredentialsService);
    private whoisResourcesService = inject(WhoisResourcesService);
    private alertsService = inject(AlertsService);
    private router = inject(Router);
    private preferenceService = inject(PreferenceService);

    public whoisObject: IWhoisObjectModel;
    public whoisObjectForDisplay: IWhoisObjectModel;
    public textObject: ITextObject = { source: '', type: '' };
    public resource: any;
    public flags: IFlag[] = [];
    public show: { editor: boolean; viewer: boolean };
    public isEditing = false;
    public isDeletable = false;
    public isWebEditingMode = true;
    public loadingResource = false;
    public showRefreshButton = false;
    public objectName: string;
    public objectType: string;
    public source = AnrrWhoisSearchService.SOURCE;

    private subscriptions: Subscription[] = [];

    constructor() {
        const router = this.router;
        let loadedOrganisation: string;
        const organisationSubscription = this.orgDropDownSharedService.selectedOrgChanged$.subscribe((selected: IUserInfoOrganisation) => {
            if (!loadedOrganisation) {
                loadedOrganisation = selected?.orgObjectId;
                return;
            }
            if (selected?.orgObjectId !== loadedOrganisation) {
                void router.navigate(['myresources/overview']);
            }
        });
        const routeSubscription = this.activatedRoute.params.subscribe(() => {
            this.isEditing = false;
            this.isDeletable = false;
            this.init();
        });
        this.subscriptions.push(organisationSubscription, routeSubscription);
    }

    public ngOnDestroy() {
        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
        this.alertsService.clearAlertMessages();
    }

    public init() {
        this.flags = [];
        this.alertsService.clearAlertMessages();
        this.show = { editor: false, viewer: true };
        const paramMap = this.activatedRoute.snapshot.paramMap;
        this.textObject.name = this.objectName = decodeURIComponent(paramMap.get('objectName'));
        this.textObject.type = this.objectType = paramMap.get('objectType').toLowerCase();
        const queryParamMap = this.activatedRoute.snapshot.queryParamMap;
        if (queryParamMap.has('alertMessage')) {
            this.alertsService.addGlobalInfo(queryParamMap.get('alertMessage'));
        }
        this.loadingResource = true;
        this.showRefreshButton = false;

        this.resourcesDataService.fetchResource(this.objectName, this.objectType).subscribe({
            next: (response: any) => {
                this.loadingResource = false;
                this.showRefreshButton = false;
                this.setWhoisObject(response.object);
                this.source = this.whoisObject?.source?.id?.toUpperCase() ?? AnrrWhoisSearchService.SOURCE;
                this.textObject.source = this.source;
                this.resource = response.resources?.[0] ?? {
                    resource: this.whoisObject['primary-key'].attribute[0].value,
                    type: this.objectType,
                };
                for (const attr of this.whoisObject.attributes.attribute) {
                    if (attr.name === 'status' || attr.name === 'netname' || attr.name === 'as-name') {
                        this.addFlag(attr.value, attr.name);
                    }
                }
            },
            error: () => {
                this.loadingResource = false;
                this.showRefreshButton = true;
            },
        });
    }

    public updateButtonClicked(modifiedWhoisObject: any): void {
        this.resetMessages();
        const attributesWithoutDates = modifiedWhoisObject.attributes.attribute.filter(
            (attr: IAttributeModel) => attr.name !== 'last-modified' && attr.name !== 'created',
        );
        const object = { objects: { object: [{ attributes: { attribute: attributesWithoutDates } }] } };
        const pKey = modifiedWhoisObject['primary-key'].attribute[0].value;
        this.restService.modifyObject(this.source, this.objectType, pKey, object, this.overrideCredentialsService.getOverrideForRestCall()).subscribe({
            next: (response: IWhoisResponseModel) => this.onSubmitSuccess(response),
            error: (response: any) => this.onSubmitError(response),
        });
        setTimeout(() => {
            this.show.viewer = !this.show.viewer;
            this.show.editor = !this.show.editor;
        }, 1000);
    }

    public submit(whoisResources: any) {
        if (whoisResources.data?.errormessages) {
            this.onSubmitError(whoisResources);
        } else {
            this.textObject.rpsl = whoisResources.rpsl;
            this.onSubmitSuccess(whoisResources);
        }
    }

    public showObjectEditor() {
        this.resetMessages();
        this.isEditing = true;
        this.isDeletable = this.isDeletableResource();
        this.isWebEditingMode = this.preferenceService.isWebMode();
        document.querySelector('#editortop')?.scrollIntoView();
    }

    public hideObjectEditor() {
        this.resetMessages();
        this.isEditing = false;
        this.isDeletable = false;
    }

    public switchToTextMode() {
        this.preferenceService.setTextMode();
        this.isWebEditingMode = false;
    }

    public switchToWebMode() {
        this.preferenceService.setWebMode();
        this.isWebEditingMode = true;
    }

    public isDeletableResource(): boolean {
        return !this.whoisResourcesService.isComaintained(this.whoisObject.attributes.attribute);
    }

    public deleteClicked() {
        const inputData = { name: this.objectName, objectType: this.objectType, onCancelPath: '', source: this.source };
        const modalRef = this.modalService.open(ModalDeleteObjectComponent);
        modalRef.componentInstance.inputData = inputData;
        modalRef.closed.subscribe(() => {
            const parent = this.hierarchySelectorService.getParent(this.objectName);
            void this.router.navigate(['myresources/detail', this.objectType, parent], {
                queryParams: { alertMessage: `The ${this.objectType} for ${this.objectName} has been deleted` },
            });
        });
        modalRef.dismissed.subscribe(() => void this.router.navigate(['myresources/detail', this.objectType, this.objectName]));
    }

    private resetMessages() {
        this.alertsService.clearAlertMessages();
        this.whoisObject?.attributes?.attribute?.forEach((attribute) => {
            attribute.$$error = '';
            attribute.$$invalid = false;
        });
    }

    private onSubmitSuccess(whoisResources: IWhoisResponseModel): void {
        const results = whoisResources.objects.object;
        results[0].attributes.attribute = results[0].attributes.attribute.map((attr) => ({ ...attr, value: attr.value.trim() }));
        if (results.length >= 1) {
            this.setWhoisObject(results[0]);
        }
        this.isEditing = false;
        this.isDeletable = false;
        this.loadMessages(whoisResources);
        this.alertsService.addGlobalSuccesses('Your object has been successfully updated.');
        document.querySelector('#editortop')?.scrollIntoView();
    }

    private loadMessages(whoisResources: IWhoisResponseModel): void {
        if (whoisResources?.errormessages?.errormessage) {
            this.alertsService.addAlertMsgs(whoisResources);
        }
    }

    private setWhoisObject(object: IWhoisObjectModel): void {
        this.whoisObject = object;
        this.whoisObjectForDisplay = {
            ...object,
            attributes: {
                ...object.attributes,
                attribute: (object.attributes?.attribute ?? [])
                    .filter((attribute) => attribute.name !== 'sponsoring-org')
                    .map((attribute) => ({ ...attribute })),
            },
        };
    }

    private onSubmitError(whoisResources: { data: IWhoisResponseModel }): void {
        const attributeErrors = whoisResources.data.errormessages.errormessage.filter((error) => error.attribute);
        attributeErrors.forEach((error) => {
            const attribute = this.whoisObject.attributes.attribute.find((item) => item.name === error.attribute.name && item.value === error.attribute.value);
            if (attribute) {
                attribute.$$error = WhoisResourcesService.readableError(error);
            }
        });
        this.loadMessages(whoisResources.data);
        if (this.alertsService.alerts.errors.length === 0) {
            this.alertsService.addGlobalError('Your object NOT updated, please review issues below');
        }
        document.querySelector('#editortop')?.scrollIntoView();
    }

    private addFlag(textOnFlag: string, tooltip: string, colour?: string) {
        const flag: IFlag = { colour, tooltip, text: textOnFlag };
        if (tooltip === 'status') {
            this.flags.unshift(flag);
        } else {
            this.flags.push(flag);
        }
    }
}
