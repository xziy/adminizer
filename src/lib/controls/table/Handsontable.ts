import {AbstractControls, ControlType, Config, Path} from "../AbstractControls";

export class Handsontable extends AbstractControls{
    readonly config: Config = {
        rowHeaders: true,
        height: 'auto',
        width: 'auto',
        manualColumnResize: true,
        contextMenu: true,
        language: 'en-US',
        licenseKey: 'non-commercial-and-evaluation', // for non-commercial use only
    };
    readonly name: string = "handsontable";
    readonly path: Path = {
        dev: '',
        production: ''
    };
    readonly type: ControlType = 'table';

    constructor(routePrefix: string) {
        super(routePrefix);
    }
    getConfig(): Config | undefined {
        return this.config;
    }

    getName(): string {
        return this.name;
    }

    getPath(): Path | string | undefined {
        return this.path;
    }

}
