import LinkBase, {Links} from "../../dist/lib/widgets/abstractLink";

export class SiteLinks extends LinkBase {
    icon?: string;
    size: { h: number; w: number; };
	readonly id: string = "siteLinks";
	readonly department: string = 'test';
	readonly description: string = 'links widget';
	readonly name: string = 'siteLinks';
	readonly widgetType = "link"

	readonly links: Links[] = [
		{
			name: 'Navigation',
			description: 'Navigation',
			link: '/admin/model/navigation',
			icon: 'hexagon',
			backgroundCSS: '#368869'
		},
		{
			name: 'example.com',
			description: 'link to example.com',
			link: 'https://www.example.com',
			icon: null,
			backgroundCSS: null
		},
		{
			name: 'Global Settings',
			description: 'Global Settings',
			link: '/admin/form/global',
			icon: 'polyline',
			backgroundCSS: null
		}
	];

	getLinks(): Promise<Links[]> {
		return Promise.resolve(this.links);
	}
}
