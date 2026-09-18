import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FlagComponent, IFlag } from '../../shared/flag/flag.component';
import { NameFormatterComponent } from '../../shared/name-formatter.component';

@Component({
    selector: 'resource-item',
    templateUrl: './resource-item.component.html',
    styleUrl: './resource-item.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [RouterLink, NameFormatterComponent, FlagComponent, NgClass],
})
export class ResourceItemComponent implements OnInit {
    @Input()
    public item: any;

    public flags: IFlag[] = [];

    public ngOnInit() {
        if (this.item.status) {
            this.flags.push({ text: this.item.status, tooltip: 'status' });
        }
        if (this.item.netname) {
            this.flags.push({ text: this.item.netname, tooltip: 'netname' });
        }
        if (this.item.asname) {
            this.flags.push({ text: this.item.asname, tooltip: 'as-name' });
        }
    }
}
