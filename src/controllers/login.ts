import {POWCaptcha} from "../lib/v4/POWCaptcha";
import passwordHash from "password-hash";

export default async function login(req: ReqType, res: ResType) {
    const powCaptcha = new POWCaptcha();

    if (req.originalUrl.indexOf("login") >= 0) {
        if (!req.adminizer.config.auth) {
            return res.redirect(`${req.adminizer.config.routePrefix}/`);
        }

        if (req.method.toUpperCase() === "POST") {
            let login = req.params.login;
            let password = req.params.password;
            let captchaSolution = req.params.captchaSolution;
            console.log("captchaSolution", captchaSolution)

            // Verify CAPTCHA solution
            const isCaptchaValid = powCaptcha.check(captchaSolution, `login:${req.ip}`);
            if (!isCaptchaValid) {
                return await viewAdminMessage(req, res, "Invalid CAPTCHA solution");
            }

            let user: ModelsAP["UserAP"];
            try {
                // TODO refactor CRUD functions for DataAccessor usage
                user = await req.adminizer.modelHandler.model.get("UserAP")["_findOne"]({login: login});
            } catch (e) {
                return res.status(500).send({error: e.message || 'Internal Server Error'});
            }

            if (req.body.pretend) {
                if (!user) {
                    return res.sendStatus(404);
                }
                if (req.session.UserAP.isAdministrator) {
                    req.session.adminPretender = req.session.UserAP;
                    req.session.UserAP = user;
                    return res.sendStatus(200);
                }
            }

            if (!user) {
                return await viewAdminMessage(req, res, "Wrong username or password");
            } else {
                if (req.adminizer.config.registration.confirmationRequired && !user.isConfirmed && !user.isAdministrator) {
                    return await viewAdminMessage(req, res, "Profile is not confirmed, please contact to administrator");
                }

                if (passwordHash.verify(login + password, user.passwordHashed)) {
                    if (user.expires && Date.now() > Date.parse(user.expires)) {
                        return await viewAdminMessage(req, res, "Profile expired, contact the administrator");
                    }
                    req.session.UserAP = user;
                    return res.redirect(`${req.adminizer.config.routePrefix}/`);
                } else {
                    return await viewAdminMessage(req, res, "Wrong username or password");
                }
            }
        }

        if (req.method.toUpperCase() === "GET") {
            // Generate new CAPTCHA job
            const captchaTask = await powCaptcha.getJob(`login:${req.ip}`);
            // return res.viewAdmin("login", {captchaTask: captchaTask});
            return req.Inertia.render({
                component: 'login',
                props: {
                    captchaTask: captchaTask
                }
            })
        }

    } else if (req.url.indexOf("logout") >= 0) {
        if (req.session.adminPretender && req.session.adminPretender.id && req.session.UserAP && req.session.UserAP.id) {
            req.session.UserAP = req.session.adminPretender;
            req.session.adminPretender = {};
            return res.redirect(`${req.adminizer.config.routePrefix}/`);
        }
        req.session.UserAP = undefined;
        res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    }
}

async function viewAdminMessage(req: ReqType, res: ResType, message: string) {
    const powCaptcha = new POWCaptcha();
    const captchaTask = await powCaptcha.getJob(`login:${req.ip}`);
    req.session.messages.adminError.push(message);

    return res.viewAdmin("login", {captchaTask: captchaTask});
}
