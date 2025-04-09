import {AbstractControls, ControlType, Config, Path} from "../../../dist/lib/controls/AbstractControls";

export class ReactSimple extends AbstractControls {
    readonly name: string = 'react-simple';
    readonly type: ControlType = 'wysiwyg';
    readonly path: Path = {
        dev: '/modules/controls/wysiwyg/react-simple-editor.tsx',
        production: '/adminizer/assets/modules/react-simple-editor.es.js'
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
