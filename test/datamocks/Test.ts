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
      model: "Test",
    },

    // Односторонняя связь на Example
    example: {
      model: "example",
    },

    // Ассоциация к UserAP (владелец)
    owner: {
      model: "userap",
    },

    // Многих пользователей (many-to-many)
    userAPs: {
      collection: "userap"
    }
  },
});

export default Test;
