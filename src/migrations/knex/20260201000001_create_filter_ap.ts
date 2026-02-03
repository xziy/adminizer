import { Knex } from "knex";

/**
 * Creates FilterAP and FilterColumnAP tables for the filter system
 * Tables: filterap, filtercolumnap
 */
export async function up(knex: Knex): Promise<void> {
  // Helper to get the correct default timestamp based on database client
  const getDefaultTimestamp = () => {
    const client = knex.client.config.client;
    if (client === 'pg' || client === 'postgresql') {
      return knex.raw('CURRENT_TIMESTAMP');
    } else if (client === 'sqlite3') {
      return knex.raw("(datetime('now'))");
    } else if (client === 'mysql' || client === 'mysql2') {
      return knex.raw('CURRENT_TIMESTAMP');
    }
    return knex.fn.now();
  };

  // Helper to get UUID default based on database client
  const getUuidDefault = () => {
    const client = knex.client.config.client;
    if (client === 'pg' || client === 'postgresql') {
      return knex.raw('gen_random_uuid()');
    } else if (client === 'sqlite3') {
      // SQLite doesn't have native UUID, will need to handle in application
      return undefined;
    }
    return knex.raw('UUID()');
  };

  const defaultTimestamp = getDefaultTimestamp();
  const uuidDefault = getUuidDefault();

  // filterap
  await knex.schema.createTable("filterap", (table) => {
    if (uuidDefault) {
      table.uuid("id").primary().notNullable().defaultTo(uuidDefault);
    } else {
      table.uuid("id").primary().notNullable();
    }
    table.string("name").notNullable();
    table.text("description").nullable();
    table.string("modelName", 100).notNullable();
    table.string("slug", 100).notNullable().unique();
    table.json("conditions").nullable();
    table.string("sortField", 100).nullable();
    table.string("sortDirection", 10).nullable(); // 'ASC' or 'DESC'
    table.string("visibility", 20).nullable(); // 'private' | 'public' | 'groups' | 'system'
    table.integer("owner").nullable().references("id").inTable("userap").onDelete("CASCADE");
    table.json("groupIds").nullable();
    table.boolean("apiEnabled").nullable().defaultTo(false);
    table.string("apiKey", 64).nullable().unique();
    table.string("icon", 50).nullable();
    table.string("color", 50).nullable();
    table.boolean("isPinned").nullable().defaultTo(false);
    table.boolean("isSystemFilter").nullable().defaultTo(false);
    table.integer("version").nullable().defaultTo(1);
    table.string("schemaVersion", 50).nullable();
    table.timestamp("createdAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);
    table.timestamp("updatedAt", { useTz: false }).notNullable().defaultTo(defaultTimestamp);

    // Indexes
    table.index("modelName");
    table.index("owner");
  });

  // filtercolumnap
  await knex.schema.createTable("filtercolumnap", (table) => {
    table.increments("id").primary().notNullable();
    table.uuid("filter").nullable().references("id").inTable("filterap").onDelete("CASCADE");
    table.string("fieldName", 100).notNullable();
    table.integer("order").nullable().defaultTo(0);
    table.integer("width").nullable();
    table.boolean("isVisible").nullable().defaultTo(true);
    table.boolean("isEditable").nullable().defaultTo(false);

    // Index
    table.index("filter");
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("filtercolumnap");
  await knex.schema.dropTableIfExists("filterap");
}
