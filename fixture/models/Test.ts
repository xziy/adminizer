import Waterline from "waterline";

const Test = Waterline.Collection.extend({
	identity: "test",
	datastore: "default",
	primaryKey: "id",
	attributes: {
		// @ts-ignore
		id: { type: "number", autoMigrations: { autoIncrement: true } },
		title: { type: "string", required: true },
        example: { model: "Example" },

		owner: { 
			model: 'UserAP'
		},
		// Many-to-many relation with UserAP
		// @ts-ignore
		userAPs: {
			collection: "UserAP"
		}
	}
});

export default Test;