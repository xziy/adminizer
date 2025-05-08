import {InstallStepper} from "../lib/installStepper/installStepper";
import {Adminizer} from "../lib/Adminizer";

let installStepper = InstallStepper.getInstance();

export default async function processInstallFinalize(req: ReqType, res: ResType) {
  if (req.adminizer.config.auth.enable) {
    if (!req.user) {
      return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
    } else if (!req.adminizer.accessRightsHelper.hasPermission(`process-install-step`, req.user)) {
      return res.sendStatus(403);
    }
  }

  Adminizer.log.debug("IN PROCESS FINALIZE", installStepper.getFinalizeStatus());
  return res.json(installStepper.getFinalizeStatus())
};
