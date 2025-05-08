import SwitcherBase from "./abstractSwitch";
import InfoBase from "./abstractInfo";
import ActionBase from "./abstractAction";
import LinkBase from "./abstractLink";
import CustomBase from "./abstractCustom";
import { AdminpanelIcon } from "../../interfaces/adminpanelConfig";
import {Adminizer} from "../Adminizer";
import { UserAP } from "models/UserAP";

export type WidgetType = (SwitcherBase | InfoBase | ActionBase | LinkBase | CustomBase);
export interface WidgetConfig {
	id: string;
	type: string;
	api?: string;
	link?: string;
	description: string;
	icon: AdminpanelIcon;
	name: string;
	backgroundCSS: string;
	scriptUrl?: string;
	constructorName?: string,
	constructorOption?:  any,
	size?: { h: number; w: number; };
	added?: boolean;
	hideAdminPanelUI?:boolean
}

export class WidgetHandler {
	private widgets: WidgetType[] = [];
	public adminizer: Adminizer;

	constructor(adminizer: Adminizer) {
		this.adminizer = adminizer;
	}

	public add(widget: WidgetType): void {
		this.adminizer.accessRightsHelper.registerToken({
			id: `widget-${widget.id}`,
			name: widget.name,
			description: widget.description,
			department: widget.department
		});
		this.widgets.push(widget);
	}

	public getById(id: string): WidgetType | undefined {
		if (this.widgets.length) {
			return this.widgets.find(widget => widget.id === id);
		} else {
			return undefined
		}
	}

	public removeById(id: string): void {
		if (this.widgets.length) {
			const index = this.widgets.findIndex(widget => widget.id === id);
			if (index !== -1) {
				this.widgets.splice(index, 1);
			}
		}
	}

	public getAll(user: UserAP): Promise<WidgetConfig[]> {
		let widgets: WidgetConfig[] = []
		if (this.widgets.length) {
			let id_key = 0
			for (const widget of this.widgets) {
				if (widget instanceof SwitcherBase) {
					if (this.adminizer.accessRightsHelper.hasPermission(`widget-${widget.id}`, user)) {
						widgets.push({
							id: `${widget.id}__${id_key}`,
							type: widget.widgetType,
							api: `${this.adminizer.config.routePrefix}/widgets-switch/${widget.id}`,
							description: widget.description,
							icon: widget.icon as AdminpanelIcon,
							name: widget.name,
							backgroundCSS: widget.backgroundCSS ?? null,
							size: widget.size ?? null
						})
					}
				} else if (widget instanceof InfoBase) {
					if (this.adminizer.accessRightsHelper.hasPermission(`widget-${widget.id}`, user)) {
						widgets.push({
							id: `${widget.id}__${id_key}`,
							type: widget.widgetType,
							api: `${this.adminizer.config.routePrefix}/widgets-info/${widget.id}`,
							description: widget.description,
							icon: widget.icon as AdminpanelIcon,
							name: widget.name,
							backgroundCSS: widget.backgroundCSS ?? null,
							size: widget.size ?? null
						})
					}
				} else if (widget instanceof ActionBase) {
					if (this.adminizer.accessRightsHelper.hasPermission(`widget-${widget.id}`, user)) {
						widgets.push({
							id: `${widget.id}__${id_key}`,
							type: widget.widgetType,
							api: `${this.adminizer.config.routePrefix}/widgets-action/${widget.id}`,
							description: widget.description,
							icon: widget.icon as AdminpanelIcon,
							name: widget.name,
							backgroundCSS: widget.backgroundCSS ?? null,
							size: widget.size ?? null
						})
					}
				} else if (widget instanceof LinkBase) {
					if (this.adminizer.accessRightsHelper.hasPermission(`widget-${widget.id}`, user)) {
						let links_id_key = 0
						for (const link of widget.links) {
							widgets.push({
								name: link.name,
								id: `${widget.id}__${links_id_key}`,
								type: 'link',
								description: link.description,
								link: link.link,
								icon: link.icon,
								backgroundCSS: link.backgroundCSS
							})
							links_id_key++;
						}
					}
				} else if (widget instanceof CustomBase) {
					if (this.adminizer.accessRightsHelper.hasPermission(`widget-${widget.id}`, user)) {
						widgets.push({
							id: `${widget.id}_${id_key}`,
							type: widget.widgetType,
							api: `${this.adminizer.config.routePrefix}/widgets-custom/${widget.id}`,
							description: widget.description,
							icon: widget.icon as AdminpanelIcon,
							name: widget.name,
							backgroundCSS: widget.backgroundCSS ?? null,
							size: widget.size ?? null,
							scriptUrl: widget.scriptUrl,
							constructorName: widget.constructorName,
							constructorOption:  widget.constructorOption,
							hideAdminPanelUI: widget.hideAdminPanelUI
						})
					}
				} else {
					return Promise.resolve([])
				}
			}
		}
		return Promise.resolve(widgets)
	}

	public async getWidgetsDB(id: number, auth: boolean): Promise<WidgetConfig[]> {
		let user: UserAP;
		let widgets: WidgetConfig[];

		if (!auth) {
			// TODO refactor CRUD functions for DataAccessor usage
			user = await this.adminizer.modelHandler.model.get("UserAP")?.["_findOne"]({ login: this.adminizer.config.administrator?.login ?? 'admin' });
		} else {
			// TODO refactor CRUD functions for DataAccessor usage
			user = await this.adminizer.modelHandler.model.get("UserAP")?.["_findOne"]({ id: id });
		}

		if (!user || !user.widgets || user.widgets.length === 0) {
			if (this.adminizer.config.dashboard && typeof this.adminizer.config.dashboard !== "boolean" && this.adminizer.config.dashboard.defaultWidgets) {
				let defaultWidgets = this.adminizer.config.dashboard.defaultWidgets;
				widgets = await this.getAll(user);
				widgets.forEach(widget => {
					if (defaultWidgets.includes(widget.id.split("__")[0])) {
						widget.added = true;
					}
				});
			}
		} else {
			widgets = user.widgets;
		}

		return widgets;
	}


	public async setWidgetsDB(id: number, widgets: WidgetConfig[], auth: boolean): Promise<number> {
		if (!auth) {
			// TODO refactor CRUD functions for DataAccessor usage
			let updatedUser: UserAP = await this.adminizer.modelHandler.model.get("UserAP")?.["_updateOne"]({ login: this.adminizer.config.administrator?.login ?? 'admin' }, { widgets: widgets })
			return updatedUser.id
		} else {
			// TODO refactor CRUD functions for DataAccessor usage
			let updatedUser: UserAP = await this.adminizer.modelHandler.model.get("UserAP")?.["_updateOne"]({ id: id }, { widgets: widgets })
			return updatedUser.id
		}

	}
}
