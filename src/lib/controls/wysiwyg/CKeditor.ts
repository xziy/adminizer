import {AbstractControls, ControlType, Config, Path} from "../AbstractControls";

export class CKeditor extends AbstractControls {
    readonly name: string = 'ckeditor';
    readonly type: ControlType = 'wysiwyg';
    readonly path: Path = {
        dev: '',
        production: ''
    }
    readonly config: Config = {
        items: [
            'sourceEditing',
            'showBlocks',
            '|',
            'heading',
            '|',
            'bold',
            'italic',
            'underline',
            '|',
            'horizontalLine',
            'link',
            'insertImageViaUrl',
            'insertTable',
            'blockQuote',
            '|',
            'alignment',
            '|',
            'bulletedList',
            'numberedList',
            'outdent',
            'indent',
        ],
    };

    constructor(routPrefix: string) {
        super(routPrefix);
    }

    getConfig(): Config {
        return this.config;
    }

    getPath(): Path {
        return undefined;
    }

}
