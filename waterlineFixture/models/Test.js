import Waterline from "waterline";
const Test = Waterline.Collection.extend({
    identity: "test",
    datastore: "default",
    primaryKey: "id",
    attributes: {
        // @ts-ignore
        id: { type: "number", autoMigrations: { autoIncrement: true } },
        title: { type: "string", required: true },
        title_2: { type: "string" },
        test_ck5_1: { type: "string" },
        sort: { type: "boolean" },
        sort_test: { type: "boolean" },
        datatable: { type: "json" },
        image: { type: "json" },
        gallery: { type: "json" },
        file: { type: "json" },
        range: { type: "string" },
        json: { type: "json" },
        tui: { type: "string" },
        ace: { type: "json" },
        datetime: { type: "string" },
        date: { type: "string" },
        time: { type: "string" },
        number: { type: "number" },
        color: { type: "string" },
        week: { type: "string" },
        schedule: { type: "json" },
        examples: { collection: "example", via: "owner" },
        select: { type: "string" },
        geojson: { type: "json" },
        guardedField: { type: "string" },
        testRelation: { model: "test" }
    }
});
export default Test;
