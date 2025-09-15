import {AbstractModel} from "./AbstractModel";
import {Adminizer} from "../Adminizer";

export class ModelHandler {
  private models: Map<string, AbstractModel<any>> = new Map();

  add<T>(modelName: string, modelInstance: AbstractModel<T>): void {
    

    const modelname = modelName.toLowerCase()
    this.models.set(modelname, modelInstance);
    Adminizer.log.debug(`Model with name [${modelname}] was registered`)
  }

  // TODO: 'hot reload' need add method for delete model

  /** Improved model getter, so you can write both model.get("UserAP") and model.get("userap") */
  get model() {
    
    return {
      get: (modelName: string) => this.models.get(modelName.toLowerCase()),
      has: (modelName: string) => this.models.has(modelName.toLowerCase()),
      entries: () => this.models.entries(),
      keys: () => this.models.keys(),
      values: () => this.models.values(),
    };
  }
}
