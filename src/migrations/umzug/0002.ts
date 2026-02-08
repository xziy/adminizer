import { QueryInterface, DataTypes } from "sequelize";

type Ctx = { context: QueryInterface };

export async function up({ context }: Ctx): Promise<void> {
  await context.createTable("filterap", {
    id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
    modelName: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    conditions: { type: DataTypes.JSON, defaultValue: [] },
    sortField: { type: DataTypes.STRING },
    sortDirection: { type: DataTypes.STRING, defaultValue: "ASC" },
    visibility: { type: DataTypes.STRING, defaultValue: "private" },
    ownerId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "userap", key: "id" }, onDelete: "CASCADE" },
    groupIds: { type: DataTypes.JSON, defaultValue: [] },
    apiEnabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    apiKey: { type: DataTypes.STRING, unique: true },
    icon: { type: DataTypes.STRING },
    color: { type: DataTypes.STRING },
    isPinned: { type: DataTypes.BOOLEAN, defaultValue: false },
    isSystemFilter: { type: DataTypes.BOOLEAN, defaultValue: false },
    version: { type: DataTypes.INTEGER, defaultValue: 1 },
    schemaVersion: { type: DataTypes.STRING },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  await context.addIndex("filterap", ["modelName"]);
  await context.addIndex("filterap", ["ownerId"]);
  await context.addIndex("filterap", ["apiKey"]);
  await context.addIndex("filterap", ["slug"]);

  await context.createTable("filtercolumnap", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    filterId: { type: DataTypes.UUID, allowNull: false, references: { model: "filterap", key: "id" }, onDelete: "CASCADE" },
    fieldName: { type: DataTypes.STRING, allowNull: false },
    order: { type: DataTypes.INTEGER, defaultValue: 0 },
    width: { type: DataTypes.INTEGER },
    isVisible: { type: DataTypes.BOOLEAN, defaultValue: true },
    isEditable: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  });

  await context.addIndex("filtercolumnap", ["filterId"]);
}

export async function down({ context }: Ctx): Promise<void> {
  await context.dropTable("filtercolumnap");
  await context.dropTable("filterap");
}
