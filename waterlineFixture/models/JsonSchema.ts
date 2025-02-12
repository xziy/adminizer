import Waterline from "waterline";

const JsonSchema = Waterline.Collection.extend({
	identity: "jsonschema",
	datastore: "default",
	primaryKey: "id",
	attributes: {
		// @ts-ignore
		id: { type: "number", autoMigrations: { autoIncrement: true } },
		data: { type: "json" }
	}
});

export default JsonSchema;
