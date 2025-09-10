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
        disabled_text: { type: "string"},
        sort: { type: "boolean" },
        time: { type: "string" },
        number: { type: "number" },
        color: { type: "string" },
        range: { type: "string" },
        date: { type: "string" },
        month: { type: "string" },
        week: { type: "string" },
        code: { type: "string" },
        editor: { type: "string" },
        selectMany: { type: "json" },
        select: { type: "string" },
        testRelation: { model: "Example" },
        tui: { type: "string" },
        datatable: { type: "json" },
        json: { type: "json" },
        tests: { collection: "Test", via: "example" },
        datetime: { type: "string" },
        geojson: { type: "json" },
        
        // Many-to-many relation with UserAP
		// @ts-ignore
        owner: { 
			model: 'UserAP'
		},
    }
});

export default Example;
