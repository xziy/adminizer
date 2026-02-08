import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("userap", (table) => {
    table.string("apiToken", 80).unique().nullable();
    table.timestamp("apiTokenCreatedAt", { useTz: false }).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("userap", (table) => {
    table.dropColumn("apiTokenCreatedAt");
    table.dropColumn("apiToken");
  });
}
