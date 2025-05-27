import Waterline from "waterline";

const Category = Waterline.Collection.extend({
  identity: "category",
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

export default Category;
