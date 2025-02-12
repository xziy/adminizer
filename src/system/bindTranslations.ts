import {TranslationHelper} from "../helpers/translationHelper";
import * as fs from "fs";
import {Adminizer} from "../lib/Adminizer";

export default function bindTranslations(adminizer: Adminizer) {
  // load adminpanel translations
  TranslationHelper.loadTranslations(adminizer, `${adminizer.config.rootPath}/translations`);

  if (typeof adminizer.config.translation === 'boolean') {
    if (adminizer.config.translation as boolean === true) {
      Adminizer.log.warn("adminizer.config.translation is TRUE, is not mater")
    }
    return
  }
  if (fs.existsSync(adminizer.config.translation.path)) {
    let translationsDir = fs.readdirSync(adminizer.config.translation.path);
    if (translationsDir.length) {
      // load project translations
      TranslationHelper.loadTranslations(adminizer, `${process.cwd()}/${adminizer.config.translation.path}`);
    }
  }
}
