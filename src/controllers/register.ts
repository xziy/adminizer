import {generate} from "password-hash";

export default async function register(req: ReqType, res: ResType) {
  if (!req.adminizer.config.auth || req.adminizer.config.registration?.enable !== true) {
    return res.redirect(`${req.adminizer.config.routePrefix}/`);
  }

  if (req.method.toUpperCase() === "POST") {
    console.log("req.body", req.body);

    if (!req.body.login || !req.body.fullName || !req.body.password) {
      return res.status(400).send({ error: 'Missing required parameters' });
    }

    let user: ModelsAP["UserAP"];
    try {
      // TODO refactor CRUD functions for DataAccessor usage
      user = await req.adminizer.modelHandler.model.get("UserAP")["_findOne"]({ login: req.body.login });
    } catch (e) {
      return res.status(500).send({ error: e.message || 'Internal Server Error' });
    }

    if (user) {
      req.session.messages.adminError.push("This login is already registered, please try another one");
      return res.viewAdmin("register");
    } else {
      try {
        let passwordHashed = generate(req.body.login + req.body.password);
        let password = 'masked';
        // TODO refactor CRUD functions for DataAccessor usage
        let userap: ModelsAP["UserAP"] = await req.adminizer.modelHandler.model.get("UserAP")["_create"]({
          login: req.body.login, password: password, passwordHashed: passwordHashed, fullName: req.body.fullName,
          email: req.body.email, locale: req.body.locale });
        // TODO refactor CRUD functions for DataAccessor usage
        let defaultUserGroup: ModelsAP["GroupAP"] = await req.adminizer.modelHandler.model.get("GroupAP")["_findOne"]({name: req.adminizer.config.registration.defaultUserGroup});
        // TODO refactor CRUD functions for DataAccessor usage
        await req.adminizer.modelHandler.model.get("UserAP")["_updateOne"]({id: userap.id}, {
          groups: [...userap.groups.map(group => group.id), defaultUserGroup.id]
        }); // instead of UserAP.addToCollection;

        return res.redirect(`${req.adminizer.config.routePrefix}/`);
      } catch (e) {
        return res.status(500).send({ error: e.message || 'Internal Server Error' });
      }
    }
  }

  if (req.method.toUpperCase() === "GET") {
    return res.viewAdmin("register");
  }
};
