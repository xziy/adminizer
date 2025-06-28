import Waterline from "waterline";

const Test = Waterline.Collection.extend({
  identity: "Test",
  datastore: "default",
  primaryKey: "id",

  attributes: {
    // ID
    id: {
      type: "number",
      //@ts-ignore
      autoMigrations: { autoIncrement: true },
    },

    // Примитивные поля
    title: {
      type: "string",
      required: true,
    },

    number: {
      type: "number",
      allowNull: true,
    },

    color: {
      type: "string",
      allowNull: true,
    },

    guardedField: {
      type: "string",
      allowNull: true,
    },

    // Самореференсная ассоциация
    selfAssociation: {
      model: "test",
    },

    // Односторонняя связь на Example
    example: {
      model: "example",
    },

    // Ассоциация к UserAP (владелец)
    userField: {
      model: "userap",
    },

    // Многих пользователей (many-to-many)
    // @ts-ignore
    userAPs: {
      collection: "userap"
    }
  },
});

export default Test;
