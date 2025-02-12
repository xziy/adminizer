import {InstallStepper} from "../lib/installStepper/installStepper";
import {Adminizer} from "../lib/Adminizer";
let installStepper = InstallStepper.getInstance();

export default function bindInstallStepper(adminizer: Adminizer) {
  let installStepperPolicy = function (req: ReqType, res: ResType, proceed: () => void) {
    if (!req.session.UserAP) {
      return proceed();
    }

    let goingToProcessInstallStep = req._parsedUrl.pathname === `${adminizer.config.routePrefix}/install/${installStepper.id}`;
    let goingToProcessInstallFinalize = req._parsedUrl.pathname === `${adminizer.config.routePrefix}/install/${installStepper.id}/finalize`;

    if (installStepper.hasUnprocessedSteps() && !goingToProcessInstallStep && !goingToProcessInstallFinalize) {
      return res.redirect(`${adminizer.config.routePrefix}/install/${installStepper.id}`)
    }

    return proceed()
  }

  if (Array.isArray(adminizer.config.policies) && typeof adminizer.config.policies[0] !== "string") {
    adminizer.config.policies.push(installStepperPolicy)
  } else {
    Adminizer.log.error("Can not bind install stepper. Policies is not array");
  }
};
