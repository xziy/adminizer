import { QueryInterface, DataTypes } from "sequelize";

type Ctx = { context: QueryInterface };

export async function up({ context }: Ctx): Promise<void> {
  await context.addColumn("filterap", "selectedFields", {
    type: DataTypes.JSON,
    defaultValue: []
  });
}

export async function down({ context }: Ctx): Promise<void> {
  await context.removeColumn("filterap", "selectedFields");
}
