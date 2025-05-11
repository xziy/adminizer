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
		// Many-to-many relation with UserAP
		// @ts-ignore
		userAPs: {
			collection: "userap"
		}
	}
});

export default Test;