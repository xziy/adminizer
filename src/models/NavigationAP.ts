export default {
  id: {
    type: "string",
    allowNull: false,
    uuid: true,
    primaryKey: true,
    required: true
  },
  label: {
    type: "string",
    required: true
  },
  tree: {
    type: "json",
    required: true
  }
}

export interface NavigationAP {
  id: string;
  label: string;
  tree: Record<string, unknown>;
}
