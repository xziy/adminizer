import { QueryInterface, DataTypes } from "sequelize";

type Ctx = { context: QueryInterface };

export async function up({ context }: Ctx): Promise<void> {
  await context.addColumn("userap", "apiToken", {
    type: DataTypes.STRING(80),
    unique: true,
    allowNull: true
  });
  await context.addColumn("userap", "apiTokenCreatedAt", {
    type: DataTypes.DATE,
    allowNull: true
  });
}

export async function down({ context }: Ctx): Promise<void> {
  await context.removeColumn("userap", "apiTokenCreatedAt");
  await context.removeColumn("userap", "apiToken");
}
