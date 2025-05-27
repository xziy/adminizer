import Waterline from "waterline";

const Page = Waterline.Collection.extend({
  identity: "page",
  datastore: "default",
  primaryKey: "id",
  attributes: {
    id: {
      type: "number",
      autoMigrations: { autoIncrement: true }
    },
    title: {
      type: "string"
    },
  }
});

export default Page;
