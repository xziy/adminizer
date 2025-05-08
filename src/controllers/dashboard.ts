export default function (req: ReqType, res: ResType) {
    if (req.adminizer.config.auth.enable && !req.user) {
        return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    }

    return req.Inertia.render({
        component: 'dashboard',
        props: null
    });
};
