import {Adminizer} from "../Adminizer";

export type ControlType = 'wysiwyg' | 'ace' | 'jsonEditor' | 'geoJson' | 'markdown' | 'table'

export interface Path {
    jsPath: {
        dev: string
        production: string
    },
    cssPath: string
}

export type Config = Record<string, string | string[] | object | number | boolean>

/**
 * AbstractControls
 */
export abstract class AbstractControls {
    public abstract readonly name: string;
    public abstract readonly type: ControlType;
    public abstract readonly path: Path
    public abstract readonly config: Config
    public readonly routPrefix: string

    protected constructor(adminizer: Adminizer) {
        this.routPrefix = adminizer.config.routePrefix
    }

    public abstract getConfig(): Config | undefined

    public abstract getJsPath(): string | undefined
    public abstract getCssPath(): string | undefined

    public abstract getName(): string
}
