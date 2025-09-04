import {POWCaptcha} from "../lib/v4/POWCaptcha";
import passwordHash from "password-hash";
import {inertiaLoginHelper} from "../helpers/inertiaAutHelper";
import { Adminizer } from "../lib/Adminizer";
import { signUser } from "../lib/v4/helper/jwt";
import { serialize } from "cookie";
import { UserAP } from "models/UserAP";



export default async function login(req: ReqType, res: ResType) {
    const powCaptcha = new POWCaptcha();
    if (req.originalUrl.indexOf("login") >= 0) {
        if (!req.adminizer.config.auth.enable) {
            return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/`);
        }

        if (req.method.toUpperCase() === "POST") {
            let login = req.body.login;
            let password = req.body.password;
            let captchaSolution = req.body.captchaSolution;

            // Handle pretend (impersonation) first against internal users list
            if (req.body.pretend) {
                try {
                    // TODO refactor CRUD functions for DataAccessor usage
                    const pretendUser = await req.adminizer.modelHandler.model.get("UserAP")["_findOne"]({ login });
                    if (!pretendUser) {
                        return res.sendStatus(404);
                    }
                    if (req.user.isAdministrator) {
                        req.session.userPretended = pretendUser;
                        return req.Inertia.redirect(`${req.adminizer.config.routePrefix}`);
                    }
                    return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/`);
                } catch (e) {
                    return res.status(500).send({error: e.message || 'Internal Server Error'});
                }
            }
            let authenticatedExternally = false;

            // Verify CAPTCHA solution if enabled
            if (req.adminizer.config.auth.captcha !== false) {
                const isCaptchaValid = powCaptcha.check(captchaSolution, `login:${req.ip}`);
                if (!isCaptchaValid) {
                    return inertiaAdminMessage(req, "Invalid CAPTCHA solution", 'captchaSolution');
                }
            }

            // First check UserAP model (local auth)
            let user: UserAP;
            try {
                // TODO refactor CRUD functions for DataAccessor usage
                user = await req.adminizer.modelHandler.model.get("UserAP")["_findOne"]({login: login});
            } catch (e) {
                return res.status(500).send({error: e.message || 'Internal Server Error'});
            }

            if (user) {
                // User found in UserAP, validate password
                if (req.adminizer.config.registration.confirmationRequired && user.isConfirmed === false && !user.isAdministrator) {
                    return inertiaAdminMessage(req, "Profile is not confirmed, please contact to administrator", 'captchaSolution');
                }

                if (passwordHash.verify(login + password + process.env.AP_PASSWORD_SALT, user.passwordHashed)) {
                    if (user.expires && Date.now() > Date.parse(user.expires)) {
                        return inertiaAdminMessage(req, "Profile expired, contact the administrator", 'captchaSolution');
                    }

                    const token = signUser(user, req.adminizer.jwtSecret);
                    res.setHeader('Set-Cookie', serialize('adminizer_jwt', token, {
                        httpOnly: true,
                        sameSite: 'lax',
                        path: '/',
                        maxAge: 60 * 60 * 24 * 7 * 2,
                    }));
                    return req.Inertia.redirect(`${req.adminizer.config.routePrefix}`);
                } else {
                    return inertiaAdminMessage(req, "Wrong password", 'password');
                }
            }

            // If user not found in UserAP and external auth handler is configured, try external auth
            if (typeof req.adminizer.authHandler === 'function') {
                try {
                    const extUser = await req.adminizer.authHandler(req, login, password);
                    if (!extUser) {
                        return inertiaAdminMessage(req, "Wrong username or password", 'login');
                    }

                    const externalUser = extUser as UserAP;
                    if (req.adminizer.config.registration.confirmationRequired && externalUser.isConfirmed === false && !externalUser.isAdministrator) {
                        return inertiaAdminMessage(req, "Profile is not confirmed, please contact to administrator", 'captchaSolution');
                    }
                    if (externalUser.expires && Date.now() > Date.parse(externalUser.expires)) {
                        return inertiaAdminMessage(req, "Profile expired, contact the administrator", 'captchaSolution');
                    }

                    const token = signUser(externalUser as any, req.adminizer.jwtSecret);
                    res.setHeader('Set-Cookie', serialize('adminizer_jwt', token, {
                        httpOnly: true,
                        sameSite: 'lax',
                        path: '/',
                        maxAge: 60 * 60 * 24 * 7 * 2,
                    }));
                    return req.Inertia.redirect(`${req.adminizer.config.routePrefix}`);
                } catch (err) {
                    Adminizer.log.error('External auth handler error', err);
                    return res.status(500).send({error: 'Internal Server Error'});
                }
            }

            // If neither UserAP nor external auth worked
            return inertiaAdminMessage(req, "Wrong username or password", 'login');
        }

        if (req.method.toUpperCase() === "GET") {
            // Generate new CAPTCHA task if enabled
            let captchaTask: number[] = [];
            if (req.adminizer.config.auth.captcha !== false) {
                captchaTask = await powCaptcha.getJob(`login:${req.ip}`);
            }
            return req.Inertia.render({
                component: 'login',
                props: {
                    description: req.adminizer.config.auth.description,
                    captchaTask: captchaTask,
                    ...inertiaLoginHelper(req),
                }
            })
        }

    } else if (req.originalUrl.indexOf("logout") >= 0) {
        if (req.session.userPretended && req.session.userPretended.id && req.user && req.user.id) {
            delete(req.session.userPretended);
            return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/`);
        }
        req.user = undefined;
        res.setHeader('Set-Cookie', serialize('adminizer_jwt', '', {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            expires: new Date(0),
        }));
        req.Inertia.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    }
    return res.status(404);
}

async function inertiaAdminMessage(req: ReqType, message: string, messageType: string) {
    Adminizer.log.warn(message)
    const powCaptcha = new POWCaptcha();
    // Generate new CAPTCHA task if enabled
    let captchaTask: number[] = [];
    if (req.adminizer.config.auth.captcha !== false) {
        captchaTask = await powCaptcha.getJob(`login:${req.ip}`);
    }

    let errors: Record<string, string> = {};
    errors[messageType] = message
    return req.Inertia.render({
        component: 'login',
        props: {
            description: req.adminizer.config.auth.description,
            captchaTask: captchaTask,
            errors: errors,
            ...inertiaLoginHelper(req),
        }
    })
}
