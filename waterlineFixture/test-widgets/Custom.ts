import CustomBase from '../../dist/lib/widgets/abstractCustom';

export class CustomOne extends CustomBase {
	readonly id: string = 'site_custom';
	readonly department: string = 'test';
	readonly description: string = 'Widget Custom One';
	readonly icon: string = 'dog';
	readonly name: string = 'Site Custom';
	readonly widgetType = 'custom';
	readonly backgroundCSS = '#da4fcf'
	readonly size = {
		h: 3,
		w: 2
	}

	public readonly  hideAdminPanelUI: boolean = true;

	public readonly scriptUrl: string = "/test.js";

    public readonly constructorName: string = "ColorChanger";

    public readonly constructorOption: any = {test: "/test.js", color: "red", text: "1"};
}

export class CustomTwo extends CustomBase {
	public size: { h: number; w: number; } = { h: 3, w: 3};
	readonly id: string = 'custom_two';
	readonly department: string = 'test_two';
	readonly description: string = 'Widget Custom Two';
	readonly icon: string = 'cat';
	readonly name: string = 'Custom Two';
	readonly widgetType = 'custom';
	readonly backgroundCSS = '#779d64'

	public readonly  hideAdminPanelUI: boolean = true;

	public readonly scriptUrl: string = "/test.js";

    public readonly constructorName: string = "ColorChanger";

    public readonly constructorOption: any = {test: "/test.js", color: "blue", text: "2"};

}
