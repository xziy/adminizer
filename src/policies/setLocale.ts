export default async function setLocale(req: ReqType, res: ResType, proceed: ()=>void) {
  if (!req.i18n) {
    return proceed();
  }

  if (typeof req.adminizer.config.translation  === 'boolean') {
    return proceed();
  }

  if (req.session.UserAP && req.session.UserAP.locale) {
    req.i18n.setLocale(req.session.UserAP.locale);
  } else {
    req.i18n.setLocale(req.adminizer.config.translation.defaultLocale);
  }
  return proceed()
}
