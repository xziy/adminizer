import { Sequelize } from "sequelize-typescript";
import { SequelizeAdapter } from "adminizer/lib/model/adapter/sequelize";
import { Post } from "../models/Post";

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

  await SequelizeAdapter.registerSystemModels(sequelizeInstance);
  sequelizeInstance.addModels([Post]);
  await sequelizeInstance.sync();

  return sequelizeInstance;
}
