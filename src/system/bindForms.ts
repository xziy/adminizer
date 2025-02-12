import * as fs from "fs";
import {FormHelper} from "../helpers/formHelper";
import {Adminizer} from "../lib/Adminizer";

export default async function bindForms(adminizer: Adminizer) {
  if (fs.existsSync(adminizer.config.forms.path)) {
    let formsDir = fs.readdirSync(adminizer.config.forms.path);
    if (formsDir.length) {
      FormHelper.loadForms(adminizer, `${process.cwd()}/${adminizer.config.forms.path}`);
    }
  }

  adminizer.emitter.on("orm:loaded", async () => {
    // Seeding forms data
    for (let form in adminizer.config.forms.data) {
      for (let key in adminizer.config.forms.data[form]) {
        if (await adminizer.config.forms.get(form, key) === undefined) {
          await adminizer.config.forms.set(form, key, adminizer.config.forms.data[form][key].value);
        }
      }
    }
  })

}
