export default {
  id: {
    type: "string",
    allowNull: false,
    uuid: true,
    primaryKey: true,
    required: true
  },
  key: {
    type: "string"
  },
  value: {
    type: "json"
  },
  isPublic: {
    type: "boolean"
  },
  parent: {
    model: "MediaManagerAP"
  }
}
