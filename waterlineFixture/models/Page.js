import Waterline from "waterline";
const Page = Waterline.Collection.extend({
    identity: "page",
    datastore: "default",
    primaryKey: "id",
    attributes: {
        // @ts-ignore
        id: { type: "number", autoMigrations: { autoIncrement: true } },
        title: {
            type: 'string',
            required: true
        },
        slug: {
            type: 'string',
            required: true
        },
        about: {
            type: 'string'
        },
        text: {
            type: "json"
        },
        navigation: {
            collection: 'catalogpagenav',
            via: 'pages'
        }
    }
});
export default Page;
