import {MaterialIcon} from "material-icons";

export default abstract class CustomBase {
    /** Widget unique id */
    public abstract readonly id: string;

    /** Widget Name */
    public abstract readonly name: string;

    /** JS module file path */
    public abstract readonly jsPath: {
        dev: string
        production: string
    }

    /** For group access rights by department */
    public abstract readonly department: string;

    /** Widget background css color */
    public readonly backgroundCSS: string;

    /** Widget size */
    public abstract readonly size: {
        h: number
        w: number
    } | null;

    /** Widget description */
    public abstract readonly description: string;

    /** Widget icon */
    public abstract readonly icon?: MaterialIcon | string;

    public readonly widgetType: 'custom' = 'custom'

    public routePrefix: string;

    protected constructor(routePrefix: string) {
        this.routePrefix = routePrefix
    }
}
