// @ts-ignore
import sailsDisk from "sails-disk";
// import sailsPostgresql from "sails-postgresql";
const config = {
    adapters: {
        disk: sailsDisk,
        // postgres: sailsPostgresql
    },
    datastores: {
        default: {
            adapter: "disk",
            // adapter: "postgres",
            // // @ts-ignore
            // url: "postgresql://user:password@localhost:5432/mydatabase",
            // ssl: false
        }
    }
};
export default config;
