import SwitchBase from "../../dist/lib/widgets/abstractSwitch";
export class SwitcherOne extends SwitchBase {
    id = 'site_switcher';
    department = 'test';
    description = 'Widget Switcher One';
    icon = 'router';
    name = 'Site Switcher';
    widgetType = 'switcher';
    backgroundCSS = '#da4fcf';
    size = {
        h: 3,
        w: 2
    };
    state = false;
    getState() {
        return Promise.resolve(this.state);
    }
    switchIt() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.state = !this.state;
                resolve(this.state);
            }, 1500);
        });
    }
}
export class SwitcherTwo extends SwitchBase {
    size = { h: 3, w: 3 };
    id = 'switcher_two';
    department = 'test_two';
    description = 'Widget Switcher Two';
    icon = 'router';
    name = 'Switcher Two';
    widgetType = 'switcher';
    backgroundCSS = '#779d64';
    state = true;
    getState() {
        return Promise.resolve(this.state);
    }
    switchIt() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.state = !this.state;
                resolve(this.state);
            }, 2500);
        });
    }
}
