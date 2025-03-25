/**
 * Welcome text
 */
export default function welcome(req: ReqType, res: ResType) {
  if (req.adminizer.config.auth && !req.session.UserAP) {
    return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
  }

  return res.viewAdmin('welcome', {entity: "entity"});
};
