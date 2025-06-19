import type { Config } from "waterline";
// @ts-ignore
import sailsDisk from "sails-disk";
// import sailsPostgresql from "sails-postgresql";

const config: Config = {
  adapters: {
    disk: sailsDisk,
    // postgres: sailsPostgresql
  },
  datastores: {
    default: {
      adapter: "disk",
      // @ts-ignore
      inMemoryOnly: true,
      // adapter: "postgres",
      // // @ts-ignore
      // url: "postgresql://user:password@localhost:5432/mydatabase",
      // ssl: false
    }
  }
};

export default config;
