import {AbstractControls, ControlType, Path, Config } from "../AbstractControls";
import {EditorOptions} from "@toast-ui/editor/types/editor";

export class ToastUiEditor extends AbstractControls{
    readonly config: Partial<EditorOptions> = {
        hideModeSwitch: true,
        height: '400px',
        initialEditType: 'markdown',
        previewStyle: 'vertical',
    };
    readonly name: string = 'toast-ui';
    readonly path: Path = {
        dev: '',
        production: ''
    }
    readonly type: ControlType = 'markdown';

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
