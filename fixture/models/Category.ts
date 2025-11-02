import Waterline from "waterline";

const Category = Waterline.Collection.extend({
    identity: "category",
    datastore: "default",
    primaryKey: "id",
    attributes: {
        // @ts-ignore
        id: {type: "number", autoMigrations: {autoIncrement: true}},
        title: {
            type: "string"
        },
        slug: {
            type: "string"
        },
        mediamanager_one: {
            type: "json"
        },
        mediamanager_two: {
            type: "json"
        },
        single_file: {
            type: "json"
        }
    }
});

export default Category;
