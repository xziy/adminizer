import Waterline from "waterline";
const CatalogPageNav = Waterline.Collection.extend({
    identity: "catalogpagenav",
    datastore: "default",
    primaryKey: "id",
    attributes: {
        // @ts-ignore
        id: { type: "number", autoMigrations: { autoIncrement: true } },
        label: {
            type: 'string'
        },
        pages: {
            model: 'page'
        },
        catalogOrder: {
            type: 'number'
        },
        parentID: {
            type: 'string'
        },
        level: {
            type: 'number'
        },
        type: {
            type: 'string'
        }
    }
});
export default CatalogPageNav;
