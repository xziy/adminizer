import * as path from "path";
import * as fs from "fs";
import {Adminizer} from "../lib/Adminizer";
import {I18n} from "../lib/I18n";

export class TranslationHelper {
  public static loadTranslations(adminizer: Adminizer, translationsPath: string): void {
    let translationsConfig = adminizer.config.translation;

    if (typeof translationsConfig === "boolean") {
      if (translationsConfig as boolean === true) {
        Adminizer.log.warn("adminizer.config.translation is TRUE, is not mater")
      }
      return
    }

    try {
      let translationsDirectoryPath = path.resolve(translationsPath);
      let translations = fs.readdirSync(translationsDirectoryPath).filter(function (file) {
        return path.extname(file).toLowerCase() === ".json";
      });

      let localesList = translationsConfig.locales;
      let defaultLocale = translationsConfig.locales.includes(translationsConfig.defaultLocale) ?
        translationsConfig.defaultLocale : translationsConfig.locales[0];
      for (let locale of localesList) {
        if (translations.includes(`${locale}.json`)) {
          try {
            let jsonData = JSON.parse(fs.readFileSync(`${translationsDirectoryPath}/${locale}.json`, 'utf8'));
            I18n.appendLocale(locale, jsonData);
            // I18n.defaultLocale = defaultLocale;
          } catch (error) {
            Adminizer.log.error(`Adminpanel > Error when reading ${locale}.json: ${error}`);
          }
        } else {
          Adminizer.log.debug(`Adminpanel > Cannot find ${locale} locale in translations directory`)
        }
      }
    } catch (e) {
      Adminizer.log.error("Adminpanel > Error when loading translations", e)
    }
  }

  public static translateProperties(i18n: I18n, object: any, fields: string[]): any {
    const translateObject = (obj: any) => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      Object.keys(obj).forEach((key) => {
        const value = obj[key];

        if (fields.includes(key) && typeof value !== 'object') {
          obj[key] = i18n.__(value);
        } else {
          obj[key] = translateObject(value);
        }
      });

      return obj;
    };

    return translateObject(object);
  }
}
