import { Sequelize } from "sequelize";
import { SequelizeAdapter } from "adminizer";
import { initPostModel } from "../models/Post";

let sequelizeInstance: Sequelize | null = null;

export async function getSequelizeInstance() {
  if (sequelizeInstance) {
    return sequelizeInstance;
  }

  sequelizeInstance = new Sequelize({
    dialect: "sqlite",
    storage: ".tmp/adminizer-nuxt3.sqlite",
    logging: false
  });

  await SequelizeAdapter.registerSystemModels(sequelizeInstance as any);
  initPostModel(sequelizeInstance);
  await sequelizeInstance.sync();

  return sequelizeInstance;
}
