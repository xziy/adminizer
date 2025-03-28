import  * as path  from "path";
import InstallStepAbstract from "../../dist/lib/installStepper/InstallStepAbstract";

export default class Step1 extends InstallStepAbstract {
  canBeSkipped = false;
  description = 'About company';
  ejsPath = path.resolve(import.meta.dirname, `./ejs/step1.ejs`);
  id = 'step1';
  scriptsUrl = '';
  sortOrder = 0;
  groupSortOrder = 1;
  stylesUrl = '';
  title = 'Example step 1';
  badge = 'step1';
  isSkipped = false;
  renderer: "ejs" = "ejs";
  isProcessed = false;

  async check() {
    return this.isProcessed;
  }

  async process(data: any, context: any) {
    this.isProcessed = true;
  }

  async skip() {
    this.isProcessed = true;
  }

  async finally() {
    await (new Promise((resolve) => setTimeout(resolve, 30000)));
  }
}
