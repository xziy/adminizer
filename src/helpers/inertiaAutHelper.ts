export function inertiaLoginHelper(req: ReqType) {
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

export function inertiaRegisterHelper(req: ReqType) {
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
