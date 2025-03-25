import {ControllerHelper} from "../helpers/controllerHelper";
import {AccessRightsToken} from "../interfaces/types";
import {Adminizer} from "../lib/Adminizer";

export default async function addGroup(req: ReqType, res: ResType) {

  let entity = ControllerHelper.findEntityObject(req);

  if (req.adminizer.config.auth) {
    if (!req.session.UserAP) {
      return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    } else if (!req.adminizer.accessRightsHelper.hasPermission(`create-${entity.name}-model`, req.session.UserAP)) {
      return res.sendStatus(403);
    }
  }

  let users: ModelsAP["UserAP"][];
  try {
    // TODO refactor CRUD functions for DataAccessor usage
    users = await req.adminizer.modelHandler.model.get("UserAP")["_find"]({isAdministrator: false});
  } catch (e) {
    Adminizer.log.error(e)
  }

  let departments = req.adminizer.accessRightsHelper.getAllDepartments();

  let groupedTokens: {
    [key: string]: AccessRightsToken[]
  } = {}

  for (let department of departments) {
    groupedTokens[department] = req.adminizer.accessRightsHelper.getTokensByDepartment(department)
  }

  if (req.method.toUpperCase() === 'POST') {
    // console.log(req.body);

    let allTokens = req.adminizer.accessRightsHelper.getTokens();

    let usersInThisGroup = [];
    let tokensOfThisGroup = [];
    for (let key in req.body) {
      if (key.startsWith("user-checkbox-") && req.body[key] === "on") {
        for (let user of users) {
          if (user.id == parseInt(key.slice(14))) {
            usersInThisGroup.push(user.id)
          }
        }
      }

      if (key.startsWith("token-checkbox-") && req.body[key] === "on") {
        for (let token of allTokens) {
          if (token.id == key.slice(15)) {
            tokensOfThisGroup.push(token.id)
          }
        }
      }
    }

    let group: ModelsAP["GroupAP"];
    try {
      // TODO refactor CRUD functions for DataAccessor usage
      group = await req.adminizer.modelHandler.model.get("GroupAP")?.["_create"]({
        name: req.body.name, description: req.body.description,
        users: usersInThisGroup, tokens: tokensOfThisGroup
      })

      Adminizer.log.debug(`A new group was created: `, group);
      req.session.messages.adminSuccess.push('A new group was created !');
      return res.redirect(`${req.adminizer.config.routePrefix}/model/groupap`);
    } catch (e) {
      Adminizer.log.error(e);
      req.session.messages.adminError.push(e.message || 'Something went wrong...');
    }

    // console.log(group)
  }

  return res.viewAdmin("addGroup", {entity: entity, users: users, groupedTokens: groupedTokens});
};
