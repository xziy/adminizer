import { QueryInterface, DataTypes } from "sequelize";

type Ctx = { context: QueryInterface };

/**
 * Creates FilterAP and FilterColumnAP tables for the filter system
 * Tables: filterap, filtercolumnap
 * Associations:
 * - FilterAP.owner -> UserAP (ownerId)
 * - FilterAP hasMany FilterColumnAP via filter (FilterColumnAP.filterId)
 */

export async function up({ context }: Ctx): Promise<void> {
  // filterap
  await context.createTable("filterap", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    modelName: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    conditions: { type: DataTypes.JSON, allowNull: true },
    sortField: { type: DataTypes.STRING(100), allowNull: true },
    sortDirection: { type: DataTypes.STRING(10), allowNull: true }, // 'ASC' or 'DESC'
    visibility: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'private' }, // 'private' | 'public' | 'groups' | 'system'
    ownerId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "userap", key: "id" }, onDelete: 'CASCADE' },
    groupIds: { type: DataTypes.JSON, allowNull: true },
    apiEnabled: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
    apiKey: { type: DataTypes.STRING(64), allowNull: true, unique: true },
    icon: { type: DataTypes.STRING(50), allowNull: true },
    color: { type: DataTypes.STRING(50), allowNull: true },
    isPinned: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
    isSystemFilter: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
    version: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
    schemaVersion: { type: DataTypes.STRING(50), allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });

  // Add indexes for filterap
  await context.addIndex("filterap", ["modelName"]);
  await context.addIndex("filterap", ["ownerId"]);

  // filtercolumnap
  await context.createTable("filtercolumnap", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
    filterId: { type: DataTypes.UUID, allowNull: true, references: { model: "filterap", key: "id" }, onDelete: 'CASCADE' },
    fieldName: { type: DataTypes.STRING(100), allowNull: false },
    order: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    width: { type: DataTypes.INTEGER, allowNull: true },
    isVisible: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
    isEditable: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
  });

  // Add index for filtercolumnap
  await context.addIndex("filtercolumnap", ["filterId"]);
}

export async function down({ context }: Ctx): Promise<void> {
  await context.dropTable("filtercolumnap");
  await context.dropTable("filterap");
}
