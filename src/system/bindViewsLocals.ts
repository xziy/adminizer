import {ViewsHelper} from "../helpers/viewsHelper";
import {MenuHelper} from "../helpers/menuHelper";
import {Adminizer} from "../lib/Adminizer";

export default function bindViewsLocals(adminizer: Adminizer) {
  /**
   * Bind adminpanel fields to views
   */
  adminizer.app.locals = {
    config: adminizer.config,
    viewsHelper: ViewsHelper,
    menuHelper: new MenuHelper(adminizer.config),
    configHelper: adminizer.configHelper,
    hasPermission: adminizer.accessRightsHelper.hasPermission.bind(adminizer.accessRightsHelper), // bind helper itself to keep the context
    enoughPermissions: adminizer.accessRightsHelper.enoughPermissions.bind(adminizer.accessRightsHelper),
    _csrf: "csrf" // TODO a lot of views uses csrf, but nobody sets it
  }
}
