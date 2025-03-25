import {ViewsHelper} from "../helpers/viewsHelper";
import {Adminizer} from "../lib/Adminizer";

export default function bindResFunctions(adminizer: Adminizer) {

  let bindResFunctions = function (req: ReqType, res: ResType, next: () => void) {
    /**
     * Guess view name by request
     *
     * @param {ReqType} req
     * @returns {string}
     */
    let guessViewName = function (req: ReqType): string {
      if (!req || !req.route || !req.route.path || typeof req.route.path !== "string") {
        return '';
      }

      let routeSplit = req.route.path.split('/');
      let viewName = routeSplit.pop();
      // :entity = list
      if (viewName === ':entityName') {
        viewName = 'list';
      }
      // for id we dont need last name
      if (viewName === ':id') {
        viewName = routeSplit.pop();
      }
      return viewName;
    };

    /**
     * Show admin panel view.
     */
    res.viewAdmin = function (specifiedPath: string, locals = {}, cb_view: (err: Error, html: string) => void) {
      if (!specifiedPath) {
        specifiedPath = guessViewName(req);
      }

      // Set theme for admin panel
      locals.theme = adminizer.config?.theme || 'light';
      locals.scripts = adminizer.config?.scripts || {};
      locals.section = locals.section || 'adminpanel';

      // Add req to views
      locals.req = req;

      if (cb_view) {
        console.warn(`Detected cb_view: ${cb_view}`);
      }

      // Rendering view
      return res.render(ViewsHelper.getViewPath(specifiedPath), locals, cb_view);
    };

    next();
  };

  adminizer.app.use('/', bindResFunctions);
  adminizer.app.use('/*', bindResFunctions);

  Adminizer.log.info("Adminizer view loaded");
  adminizer.emitter.emit("adminizer:viewadmin:loaded")
}
