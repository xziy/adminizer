import Waterline from "waterline";

const Test = Waterline.Collection.extend({
	identity: "test",
	datastore: "default",
	primaryKey: "id",
	attributes: {
		// @ts-ignore
		id: { type: "number", autoMigrations: { autoIncrement: true } },
		title: { type: "string", required: true },
        owner: { model: "example" },
	}
});

export default Test;
