export default async function timezones(req: ReqType, res: ResType) {
    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
        }
    }

    let timezones = []
    for (let timezone of req.adminizer.config.timezones) {
        timezones.push({
            value: timezone.id,
            label: timezone.name
        })
    }
    return res.json({timezones: timezones})

}
