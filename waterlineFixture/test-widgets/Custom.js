import CustomBase from '../../dist/lib/widgets/abstractCustom';
export class CustomOne extends CustomBase {
    id = 'site_custom';
    department = 'test';
    description = 'Widget Custom One';
    icon = 'takeout_dining';
    name = 'Site Custom';
    widgetType = 'custom';
    backgroundCSS = '#da4fcf';
    size = {
        h: 3,
        w: 2
    };
    hideAdminPanelUI = true;
    scriptUrl = "/test.js";
    constructorName = "ColorChanger";
    constructorOption = { test: "/test.js", color: "red", text: "1" };
}
export class CustomTwo extends CustomBase {
    size = { h: 3, w: 3 };
    id = 'custom_two';
    department = 'test_two';
    description = 'Widget Custom Two';
    icon = 'sports_mma';
    name = 'Custom Two';
    widgetType = 'custom';
    backgroundCSS = '#779d64';
    hideAdminPanelUI = true;
    scriptUrl = "/test.js";
    constructorName = "ColorChanger";
    constructorOption = { test: "/test.js", color: "blue", text: "2" };
}
