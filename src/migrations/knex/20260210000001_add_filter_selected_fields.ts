import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable("filterap", (table) => {
    table.json("selectedFields").notNullable().defaultTo("[]");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable("filterap", (table) => {
    table.dropColumn("selectedFields");
  });
}
