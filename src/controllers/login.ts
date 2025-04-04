import {POWCaptcha} from "../lib/v4/POWCaptcha";
import passwordHash from "password-hash";

export default async function login(req: ReqType, res: ResType) {
    const powCaptcha = new POWCaptcha();
    if (req.originalUrl.indexOf("login") >= 0) {
        if (!req.adminizer.config.auth) {
            return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/`);
        }

        if (req.method.toUpperCase() === "POST") {
            let login = req.body.login;
            let password = req.body.password;
            let captchaSolution = req.body.captchaSolution;

            // Verify CAPTCHA solution
            const isCaptchaValid = powCaptcha.check(captchaSolution, `login:${req.ip}`);
            if (!isCaptchaValid) {
                return inertiaAdminMessage(req, "Invalid CAPTCHA solution", 'captchaSolution');
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
                return inertiaAdminMessage(req, "Wrong username", 'login');
            } else {
                if (req.adminizer.config.registration.confirmationRequired && !user.isConfirmed && !user.isAdministrator) {
                    //Here we use the captchaSolution key to output messages unrelated to the form fields.
                    return inertiaAdminMessage(req, "Profile is not confirmed, please contact to administrator", 'captchaSolution');
                }

                if (passwordHash.verify(login + password, user.passwordHashed)) {
                    if (user.expires && Date.now() > Date.parse(user.expires)) {
                        //Here we use the captchaSolution key to output messages unrelated to the form fields.
                        return inertiaAdminMessage(req, "Profile expired, contact the administrator", 'captchaSolution');
                    }
                    req.session.UserAP = user;
                    return res.redirect(`${req.adminizer.config.routePrefix}`);
                } else {
                    return inertiaAdminMessage(req, "Wrong password", 'password');
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
                    captchaTask: captchaTask,
                    ...loginHelper(req),
                }
            })
        }

    } else if (req.originalUrl.indexOf("logout") >= 0) {
        if (req.session.adminPretender && req.session.adminPretender.id && req.session.UserAP && req.session.UserAP.id) {
            req.session.UserAP = req.session.adminPretender;
            req.session.adminPretender = {};
            return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/`);
        }
        req.session.UserAP = undefined;
        req.Inertia.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    }
    return res.status(404);
}

async function inertiaAdminMessage(req: ReqType, message: string, messageType: string) {
    const powCaptcha = new POWCaptcha();
    const captchaTask = await powCaptcha.getJob(`login:${req.ip}`);

    // req.session.messages.adminError.push(message);
    // return res.viewAdmin("login", {captchaTask: captchaTask});

    let errors: Record<string, string> = {};
    errors[messageType] = message
    return req.Inertia.render({
        component: 'login',
        props: {
            captchaTask: captchaTask,
            errors: errors,
            ...loginHelper(req),
        }
    })
}

function loginHelper(req: ReqType) {
    let props: Record<string, unknown> = {};
    props.login = req.i18n.__('Login');
    props.password = req.i18n.__('Password');
    props.title = req.i18n.__("Welcome");
    props.submitButton = req.i18n.__("Log in");
    props.submitLink = `${req.adminizer.config.routePrefix}/model/userap/login`
    if (req.adminizer.config.registration?.enable === true) {
        props.registerLink = {
            title: req.i18n.__("Register"),
            link: `${req.adminizer.config.routePrefix}/model/userap/register`
        };
    }
    return props
}
