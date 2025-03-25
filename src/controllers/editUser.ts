import {ControllerHelper} from "../helpers/controllerHelper";
import {Adminizer} from "../lib/Adminizer";
import {generate} from "password-hash";

export default async function (req: ReqType, res: ResType) {
  let entity = ControllerHelper.findEntityObject(req);

  if (req.adminizer.config.auth) {
    if (!req.session.UserAP) {
      return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    } else if (!req.adminizer.accessRightsHelper.hasPermission(`update-${entity.name}-model`, req.session.UserAP)) {
      return res.sendStatus(403);
    }
  }

  // Check id
  if (!req.params.id) {
    return res.status(404).send({error: 'Not Found'});
  }

  let user: ModelsAP["UserAP"];
  try {
    // TODO refactor CRUD functions for DataAccessor usage
    user = await req.adminizer.modelHandler.model.get("UserAP")["_findOne"]({id: req.params.id});
  } catch (e) {
    Adminizer.log.error('Admin edit error: ');
    Adminizer.log.error(e);
    res.status(500).send({error: 'Internal Server Error'});
  }

  let groups: ModelsAP["GroupAP"][];
  try {
    // TODO refactor CRUD functions for DataAccessor usage
    groups = await req.adminizer.modelHandler.model.get("GroupAP")["_find"]({});
  } catch (e) {
    Adminizer.log.error(e)
  }

  let reloadNeeded = false;
  if (req.method.toUpperCase() === 'POST') {
    // console.log(req.body);

    let userGroups = [];
    for (let key in req.body) {
      if (key.startsWith("group-checkbox-") && req.body[key] === "on") {
        for (let group of groups) {
          if (group.id == parseInt(key.slice(15))) {
            userGroups.push(group.id)
          }
        }
      }
    }

    let isAdministrator = req.body.isAdmin === "on";
    let isConfirmed = req.body.isConfirmed === "on";

    let locale: string
    if (typeof req.adminizer.config.translation !== "boolean") {
      locale = req.body.locale === 'default' ? req.adminizer.config.translation.defaultLocale : req.body.locale;
    }

    let updatedUser: ModelsAP["UserAP"];
    try {
      // TODO refactor CRUD functions for DataAccessor usage
      updatedUser = await req.adminizer.modelHandler.model.get("UserAP")["_updateOne"]({id: user.id}, {
        login: req.body.login, fullName: req.body.fullName,
        email: req.body.email, timezone: req.body.timezone, expires: req.body.date,
        locale: locale, isAdministrator: isAdministrator, isConfirmed: isConfirmed, groups: userGroups
      });
      if (req.body.userPassword) {
        let passwordHashed = generate(req.body.login + req.body.userPassword);
        let password = 'masked';
        // TODO refactor CRUD functions for DataAccessor usage
        updatedUser = await req.adminizer.modelHandler.model.get("UserAP")["_updateOne"]({id: user.id}, {
          login: req.body.login,
          password: password,
          passwordHashed: passwordHashed
        });
      }
      Adminizer.log.debug(`User was updated: `, updatedUser);
      req.session.messages.adminSuccess.push('User was updated !');
    } catch (e) {
      Adminizer.log.error(e);
      req.session.messages.adminError.push(e.message || 'Something went wrong...');
    }

    reloadNeeded = true;
  }

  if (reloadNeeded) {
    try {
      // TODO refactor CRUD functions for DataAccessor usage
      user = await req.adminizer.modelHandler.model.get("UserAP")["_findOne"]({id: req.params.id});
    } catch (e) {
      Adminizer.log.error('Admin edit error: ');
      Adminizer.log.error(e);
      return res.status(500).send({error: 'Internal Server Error'});
    }

    try {
      // TODO refactor CRUD functions for DataAccessor usage
      groups = await req.adminizer.modelHandler.model.get("GroupAP")["_find"]({});
    } catch (e) {
      Adminizer.log.error(e)
    }
  }

  return res.viewAdmin("editUser", {entity: entity, user: user, groups: groups});
};
