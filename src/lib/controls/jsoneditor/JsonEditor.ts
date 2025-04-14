import {AbstractControls, ControlType, Path, Config } from "../AbstractControls";
import {EditorOptions} from "@toast-ui/editor/types/editor";

export class JsonEditor extends AbstractControls{
    readonly config: Partial<EditorOptions> = {};
    readonly name: string = 'jsoneditor';
    readonly path: Path = {
        dev: '',
        production: ''
    }
    readonly type: ControlType = 'jsonEditor';

    constructor(routPrefix: string) {
        super(routPrefix);
    }

    getConfig(): Config | undefined {
        return this.config;
    }

    getPath(): Path | string | undefined {
        return undefined;
    }

    getName(): string {
        return this.name;
    }
}
