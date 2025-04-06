import Waterline from "waterline";

const Example = Waterline.Collection.extend({
	identity: "example",
	datastore: "default",
	primaryKey: "id",
	attributes: {
		// @ts-ignore
		id: { type: "number", autoMigrations: { autoIncrement: true } },
		title: { type: "string" },
        description: { type: "string"},
        sort: { type: "boolean" },
        range: { type: "string" },
        select: { type: "string" },
        datetime: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        month: { type: "string" },
        number: { type: "number" },
        color: { type: "string" },
        week: { type: "string" },
		// owner: { model: "test" },
	}
});

export default Example;
