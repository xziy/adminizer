export default async function getAllWidgets(req: ReqType, res: ResType) {
  if (req.adminizer.config.auth) {
    if (!req.session.UserAP) {
      return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    } else if (!req.adminizer.accessRightsHelper.hasPermission(`widgets`, req.session.UserAP)) {
      return res.sendStatus(403);
    }
  }

  if (req.method.toUpperCase() === 'GET') {
    try {
      return res.json({ widgets: await req.adminizer.widgetHandler.getAll(req.session.UserAP) })

    } catch (e) {
      return res.status(500).send({ error: e.message || 'Internal Server Error' });
    }
  }
}
