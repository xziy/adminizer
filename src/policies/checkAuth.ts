export default async function checkAuth(req: ReqType, res: ResType, proceed: ()=>void) {
  let locale: string = ""

  if (typeof req.adminizer.config.translation  !== 'boolean') {
    locale = req.adminizer.config.translation.defaultLocale
  }

  if (!req.adminizer.config.auth) {
    if (req.session.UserAP) {
      req.session.UserAP.isAdministrator = true;
    } else {
      req.session.UserAP = {
        id: 0,
        isAdministrator: true,
        locale: locale
      }
    }
  }
  return proceed()
}
