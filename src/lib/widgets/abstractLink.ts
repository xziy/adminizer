import BaseWidget from "./abstractWidgetBase";
import {MaterialIcon} from "../../interfaces/MaaterialIcons";

export interface Links {
	name: string
	description: string
	icon?: MaterialIcon
	link: string
	backgroundCSS: string | null
}

export default abstract class LinkBase extends BaseWidget {

	public readonly widgetType = "link"

	readonly abstract links: Links[]

	/** Get info */
	public abstract getLinks(): Promise<Links[]>
}
