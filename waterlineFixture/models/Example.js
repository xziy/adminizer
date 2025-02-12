import Waterline from "waterline";
const Example = Waterline.Collection.extend({
    identity: "example",
    datastore: "default",
    primaryKey: "id",
    attributes: {
        // @ts-ignore
        id: { type: "number", autoMigrations: { autoIncrement: true } },
        title: { type: "string" },
        owner: { model: "test" },
        gallery: { type: "json" },
        files: { type: "json" }
    }
});
export default Example;
