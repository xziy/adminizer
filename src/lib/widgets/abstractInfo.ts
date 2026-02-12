import { BaseWidget } from "./abstractWidgetBase";
export abstract class InfoBase extends BaseWidget {

	public readonly widgetType = "info"

	/** Widget background css color */
	public readonly backgroundCSS: string;

	/** Widget size */
	public readonly size: {
		h: number
		w: number
	} | null = null

	/** Link */
	public readonly link?: string;

	/** Link type */
	public readonly linkType?: 'self' | 'blank';

	/** Optional auto refresh interval in seconds for frontend polling */
	public readonly refreshIntervalSec?: number;

	/** Get info */
	public abstract getInfo(req?: ReqType): Promise<string>
}
