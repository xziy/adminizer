import Waterline from "waterline";

const Example = Waterline.Collection.extend({
	identity: "example",
	datastore: "default",
	primaryKey: "id",
	attributes: {
		// @ts-ignore
		id: { type: "number", autoMigrations: { autoIncrement: true } },
		title: { type: "string" },
        geojson: { type: "json" },
        description: { type: "string"},
        sort: { type: "boolean" },
        datatable: { type: "json" },
        range: { type: "string" },
        code: { type: "string" },
        editor: { type: "string" },
        tui: { type: "string" },
        selectMany: { type: "json" },
        select: { type: "string" },
        json: { type: "json" },
        testRelation: { model: "example" },
        tests: { collection: "test", via: "owner" },
        datetime: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        month: { type: "string" },
        number: { type: "number" },
        color: { type: "string" },
        week: { type: "string" },
    }
});

export default Example;
