import * as path from "path";
import * as fs from "fs";
import {AdminpanelConfig} from "../interfaces/adminpanelConfig";
import {Adminizer} from "../lib/Adminizer";

export class FormHelper {

  public static get(adminizer: Adminizer, slug: string): AdminpanelConfig["forms"]["data"][0] {
    if (adminizer.config.forms) {
      return adminizer.config.forms.data[slug]
    } else {
      throw `Form with slug ${slug} not found`
    }
  }

  public static loadForms(adminizer: Adminizer, formsPath: string): void {
    try {
      let formsDirectoryPath = path.resolve(formsPath);
      let forms = fs.readdirSync(formsDirectoryPath).filter(function (file) {
        return path.extname(file).toLowerCase() === ".json";
      });

      for (let formJson of forms) {

        if (path.extname(formJson).toLowerCase() !== ".json") {
          continue;
        }

        let form = path.basename(formJson, '.json')

        try {
          adminizer.config.forms.data[form] = require(`${formsDirectoryPath}/${formJson}`);
        } catch (error) {
          Adminizer.log.error(`Adminpanel > Error when reading ${formJson}: ${error}`);
        }
      }
    } catch (e) {
      Adminizer.log.error("Adminpanel > Error when loading forms", e)
    }
  }
}
