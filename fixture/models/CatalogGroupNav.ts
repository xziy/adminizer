import Waterline from "waterline";

const CatalogGroupNav = Waterline.Collection.extend({
    identity: "cataloggroupnav",
    datastore: "default",
    primaryKey: "id",
    attributes: {
        // @ts-ignore
        id: { type: "number", autoMigrations: { autoIncrement: true } },
        label: {
            type: 'string'
        },
        groups: {
            model: 'GroupCatalog'
        },
        childs: {
            type: 'json'
        },
        level: {
            type: 'number'
        },
        catalogOrder: {
            type: 'number'
        },
        parentID:{
            type: 'string'
        },
        type: {
            type: 'string'
        }
    }
});

export default CatalogGroupNav;
