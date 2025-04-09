export type ControlType = 'wysiwyg' | 'ace' | 'jsonEditor' | 'geoJson' | 'markdown'

export interface Path {
    dev: string,
    production: string
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

    constructor(routPrefix: string) {
        this.routPrefix = routPrefix
    }

    public abstract getConfig(): Config | undefined

    public abstract getPath(): Path | string | undefined
}
