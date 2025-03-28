import ActionBase from "../../dist/lib/widgets/abstractAction";
export class ActionOne extends ActionBase {
    icon;
    backgroundCSS;
    id = 'action_one';
    department = 'test';
    description = 'Action One';
    name = 'Action One';
    widgetType = "action";
    size = {
        h: 2,
        w: 2
    };
    action() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(true);
            }, 2000);
        });
    }
}
export class ActionTwo extends ActionBase {
    icon;
    backgroundCSS;
    id = 'action_two';
    department = 'test';
    description = 'Action Two';
    name = 'Action Two';
    widgetType = "action";
    size = {
        h: 2,
        w: 2
    };
    action() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(true);
            }, 2500);
        });
    }
}
