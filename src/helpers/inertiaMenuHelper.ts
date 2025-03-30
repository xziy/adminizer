import {Adminizer} from "../lib/Adminizer";

export class InertiaMenuHelper {
    private adminizer: Adminizer;

    constructor(adminizer: Adminizer) {
        this.adminizer = adminizer
    }

    public getMenuItems(req: Express.Request) {
        let menu = []
        for (const menuItem of this.adminizer.menuHelper.getMenuItems()) {
            const menuItemTokens = menuItem.actions ? menuItem.actions.map(item => {
                return item.accessRightsToken
            }).filter(item => {
                return item
            }) : []
            if (menuItem.accessRightsToken) menuItemTokens.push(menuItem.accessRightsToken)
            if (this.adminizer.accessRightsHelper.enoughPermissions(menuItemTokens, req.session.UserAP)) {
                menu.push(menuItem)
            }
        }
        return menu
    }

    public getBrandTitle() {
        return this.adminizer.menuHelper.getBrandTitle()
    }
}
