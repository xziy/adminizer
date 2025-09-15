import Waterline from "waterline";

const TestCatalog = Waterline.Collection.extend({
	identity: "testcatalog",
	datastore: "default",
	primaryKey: "id",
	attributes: {
		// @ts-ignore
		id: { type: "number", autoMigrations: { autoIncrement: true } },
		tree: { type: "json" },
	}
});

export default TestCatalog;
