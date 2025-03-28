import InfoBase from "../../dist/lib/widgets/abstractInfo";
export class InfoOne extends InfoBase {
    icon;
    size = { h: 3, w: 2 };
    id = 'info_one';
    department = 'test';
    description = 'Info widget One';
    name = 'Info One';
    widgetType = "info";
    info = 'Lorem ipsum';
    getInfo() {
        return Promise.resolve(this.info);
    }
}
export class InfoTwo extends InfoBase {
    icon;
    id = 'info_two';
    department = 'test';
    description = 'Info widget Two';
    name = 'Info Two';
    widgetType = "info";
    backgroundCSS = '#8c3116';
    size = {
        h: 2,
        w: 3
    };
    info = '356';
    getInfo() {
        return Promise.resolve(this.info);
    }
}
export class Info3 extends InfoBase {
    icon;
    id = 'info_3';
    department = 'test';
    description = 'Info widget 3';
    name = 'Info 31111';
    widgetType = "info";
    size = {
        h: 3,
        w: 2
    };
    info = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.';
    getInfo() {
        return Promise.resolve(this.info);
    }
}
export class Info4 extends InfoBase {
    icon;
    id = 'info_4';
    department = 'test';
    description = 'Info widget 4';
    name = 'Info 4';
    widgetType = "info";
    backgroundCSS = '#051c3a';
    size = {
        h: 2,
        w: 2
    };
    info = 'Lorem ipsum dolor sit amet.';
    getInfo() {
        return Promise.resolve(this.info);
    }
}
