import {BaseWidget} from "./abstractWidgetBase";

export abstract class ActionBase extends BaseWidget {

	public readonly widgetType = "action"

	/** Widget background css color */
	public abstract readonly backgroundCSS: string | null;

	public abstract action(): Promise<any>
}
