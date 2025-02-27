import Waterline from "waterline";

const GroupCatalog = Waterline.Collection.extend({
    identity: "groupcatalog",
    datastore: "default",
    primaryKey: "id",
    attributes: {
        // @ts-ignore
        id: { type: "number", autoMigrations: { autoIncrement: true } },
        title: {
            type: 'string'
        },
        data: {
            type: 'json'
        } as const,
        navigation: {
            collection: 'CatalogGroupNav',
            via: 'groups'
        }
    }
});

export default GroupCatalog;
