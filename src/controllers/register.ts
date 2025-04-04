import {generate} from "password-hash";

export default async function register(req: ReqType, res: ResType) {
    if (!req.adminizer.config.auth || req.adminizer.config.registration?.enable !== true) {
        return res.redirect(`${req.adminizer.config.routePrefix}/`);
    }

    if (req.method.toUpperCase() === "POST") {
        // console.log("req.body", req.body);

        // if (!req.body.login || !req.body.fullName || !req.body.password) {
        //     return res.status(400).send({error: 'Missing required parameters'});
        // }

        for (const key of ["login", "fullName", "password"]) {
            if (!req.body[key]) {
                let errors: Record<string, string> = {};
                errors[key] = "Missing required parameters";
                return req.Inertia.render({
                    component: "register",
                    props: {
                        errors: errors,
                        ...inertiaRegisterHelper(req)
                    }
                })
            }
        }

        let user: ModelsAP["UserAP"];
        try {
            // TODO refactor CRUD functions for DataAccessor usage
            user = await req.adminizer.modelHandler.model.get("UserAP")["_findOne"]({login: req.body.login});
        } catch (e) {
            return res.status(500).send({error: e.message || 'Internal Server Error'});
        }

        if (user) {
            return req.Inertia.render({
                component: "register",
                props: {
                    errors: {
                        login: "This login is already registered, please try another one"
                    },
                    ...inertiaRegisterHelper(req)
                }
            })
        } else {
            try {
                let passwordHashed = generate(req.body.login + req.body.password);
                let password = 'masked';
                // TODO refactor CRUD functions for DataAccessor usage
                let userap: ModelsAP["UserAP"] = await req.adminizer.modelHandler.model.get("UserAP")["_create"]({
                    login: req.body.login,
                    password: password,
                    passwordHashed: passwordHashed,
                    fullName: req.body.fullName,
                    email: req.body.email,
                    locale: req.body.locale
                });
                // TODO refactor CRUD functions for DataAccessor usage
                let defaultUserGroup: ModelsAP["GroupAP"] = await req.adminizer.modelHandler.model.get("GroupAP")["_findOne"]({name: req.adminizer.config.registration.defaultUserGroup});
                console.log(userap)
                // TODO refactor CRUD functions for DataAccessor usage
                await req.adminizer.modelHandler.model.get("UserAP")["_updateOne"]({id: userap.id}, {
                    groups: [defaultUserGroup.id]
                }); // instead of UserAP.addToCollection;

                return req.Inertia.redirect(`${req.adminizer.config.routePrefix}`)
            } catch (e) {
                return res.status(500).send({error: e.message || 'Internal Server Error'});
            }
        }
    }

    if (req.method.toUpperCase() === "GET") {
        // return res.viewAdmin("register");
        return req.Inertia.render({
            component: "register",
            props: inertiaRegisterHelper(req),
        });
    }
};

function inertiaRegisterHelper(req: ReqType) {
    let props: Record<string, unknown> = {};
    props.submitLink = `${req.adminizer.config.routePrefix}/model/userap/register`
    props.header = {
        title: req.i18n.__("Create an Account"),
        desc: req.i18n.__("Please fill out the fields below")
    }
    props.loginLabel = req.i18n.__("Login");
    props.fullNameLabel = req.i18n.__("Full Name");
    props.passwordLabel = req.i18n.__("Password");
    props.confirmPasswordLabel = req.i18n.__("Confirm Password*");
    props.confirmError = req.i18n.__("Passwords do not match!");
    props.emailLabel = req.i18n.__("Email");
    props.localeLabel = req.i18n.__("Locale");
    props.submitButton = req.i18n.__("Register");
    props.backToLogin = {
        link: `${req.adminizer.config.routePrefix}/model/userap/login`,
        text: req.i18n.__("Back to Login")
    }
    return props
}
