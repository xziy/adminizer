import {Adminizer} from "../lib/Adminizer";
import {generate} from "password-hash";

export default async function initUser(req: ReqType, res: ResType) {
    if (!req.adminizer.config.auth) {
        return res.redirect(`${req.adminizer.config.routePrefix}/`);
    }

    // TODO refactor CRUD functions for DataAccessor usage
    let admins: ModelsAP["UserAP"][] = await req.adminizer.modelHandler.model.get("UserAP")["_find"]({isAdministrator: true});
    if (admins.length) {
        res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    }

    if (req.method.toUpperCase() === "POST") {
        let login = req.params.login;
        let locale = req.params.locale;
        let password = req.params.password;
        let confirm_password = req.params.confirm_password;

        Adminizer.log.debug(login, password, confirm_password, 123)
        if (password !== confirm_password) {
            req.session.messages.adminError.push("Password mismatch");
            return res.viewAdmin("init_user");
        }

        try {
            Adminizer.log.debug(`Created admin`)
            let passwordHashed = generate(login + password);
            password = 'masked';
            // TODO refactor CRUD functions for DataAccessor usage
            await req.adminizer.modelHandler.model.get("UserAP")["_create"](
                {
                    login: login,
                    password: password,
                    passwordHashed: passwordHashed,
                    fullName: "Administrator",
                    isActive: true,
                    ...(locale !== undefined && {locale}),
                    isAdministrator: true
                }
            );
        } catch (e) {
            Adminizer.log.error("Could not create administrator profile", e)
            req.session.messages.adminError.push("Could not create administrator profile");
            return res.viewAdmin("init_user");
        }

        return res.redirect(`${req.adminizer.config.routePrefix}/`);
    }

    if (req.method.toUpperCase() === "GET") {
        return res.viewAdmin("init_user");
    }
};
