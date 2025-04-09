import {AbstractControls, ControlType, Config, Path} from "../../../dist/lib/controls/AbstractControls";

export class ReactQuill extends AbstractControls {
    readonly name: string = 'react-quill';
    readonly type: ControlType = 'wysiwyg';
    readonly path: Path = {
        dev: '/modules/controls/wysiwyg/react-quill-editor.tsx',
        production: '/adminizer/assets/modules/react-quill-editor.es.js'
    }
    readonly config: Config =  {};

    getConfig(): Config {
        return this.config;
    }

    getPath(): string {
        if (process.env.VITE_ENV === 'dev') {
            return this.path.dev;
        } else {
            return this.path.production
        }
    }

}
