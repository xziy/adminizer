import Waterline from "waterline";

const Example = Waterline.Collection.extend({
  identity: "example",
  datastore: "default",
  primaryKey: "id",

  attributes: {
    id: {
      type: "number",
      autoMigrations: { autoIncrement: true }
    },

    title: {
      type: "string",
      required: true
    },

    description: {
      type: "string"
    },

    // Обратная связь (1:* с Test)
    tests: {
      collection: "test",
      via: "example"
    }
  }
});

export default Example;
