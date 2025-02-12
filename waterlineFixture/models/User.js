import Waterline from "waterline";
const User = Waterline.Collection.extend({
    identity: "user",
    datastore: "default",
    primaryKey: "id",
    attributes: {
        // @ts-ignore
        id: { type: "number", autoMigrations: { autoIncrement: true } }
    }
});
export default User;
