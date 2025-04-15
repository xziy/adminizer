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
        editor: { type: "string" },
        tui: { type: "string" },
        datatable: { type: "json" },
        json: { type: "json" },
        code: { type: "string" },
        // geojson: { type: "json" },
		// owner: { model: "test" },
	}
});

export default Example;
