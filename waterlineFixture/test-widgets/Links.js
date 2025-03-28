import LinkBase from "../../dist/lib/widgets/abstractLink";
export class SiteLinks extends LinkBase {
    icon;
    size;
    id = "siteLinks";
    department = 'test';
    description = 'links widget';
    name = 'siteLinks';
    widgetType = "link";
    links = [
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
    getLinks() {
        return Promise.resolve(this.links);
    }
}
