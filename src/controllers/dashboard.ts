export default function (req: ReqType, res: ResType) {
  if (req.adminizer.config.auth && !req.session.UserAP) {
    return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
  }

  return res.viewAdmin('dashboard', {entity: "entity"});
};
