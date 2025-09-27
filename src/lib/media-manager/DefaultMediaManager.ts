import {
    AbstractMediaManager,
    MediaManagerItem,
    File,
    MediaManagerWidgetItem,
    MediaManagerWidgetData,
    MediaManagerWidgetClientItem,
    SortCriteria,
} from "./AbstractMediaManager";
import {getAssociationFieldName, populateVariants} from "./helpers/MediaManagerHelper";
import {ApplicationItem, ImageItem, TextItem, VideoItem} from "./Items";
import {Adminizer} from "../Adminizer";


export class DefaultMediaManager extends AbstractMediaManager {
    public readonly itemTypes: File<MediaManagerItem>[] = [];
    public model: string = "mediamanagerap";
    public modelAssoc: string = "mediamanagerassociationsap";
    id: string;
    protected readonly adminizer: Adminizer;

    constructor(adminizer: Adminizer, id: string, urlPathPrefix: string, fileStoragePath: string) {
        super(adminizer);
        this.id = id;
        this.urlPathPrefix = urlPathPrefix;
        this.fileStoragePath = fileStoragePath;
        this.itemTypes.push(new ImageItem(adminizer, urlPathPrefix, fileStoragePath));
        this.itemTypes.push(new TextItem(adminizer, urlPathPrefix, fileStoragePath));
        this.itemTypes.push(new ApplicationItem(adminizer, urlPathPrefix, fileStoragePath));
        this.itemTypes.push(new VideoItem(adminizer, urlPathPrefix, fileStoragePath));
        this.adminizer = adminizer;
    }

    public async getAll(limit: number, skip: number, sort: SortCriteria, group: string): Promise<{
        data: MediaManagerItem[];
        next: boolean
    }> {
        //TODO refactor CRUD functions for DataAccessor usage
        let data: MediaManagerItem[] = await this.adminizer.modelHandler.model.get(this.model)["_find"]({
            where: {parent: null, group: group},
            limit: limit,
            skip: skip,
            sort: sort,
        }, {populate: [["variants", {sort: sort}], ["meta", {}]]})


        let next = await this.adminizer.modelHandler.model.get(this.model)["_find"]({
            where: {parent: null, group: group},
            limit: limit,
            skip: skip === 0 ? limit : skip + limit,
            sort: sort,
        })

        for (let elem of data) {
            elem.variants = await populateVariants(this.adminizer, elem.variants, this.model)
        }

        return {
            data: data,
            next: !!next.length,
        };
    }

    public async searchAll(s: string, group: string): Promise<MediaManagerItem[]> {
        //TODO refactor CRUD functions for DataAccessor usage
        let data: MediaManagerItem[] = await this.adminizer.modelHandler.model.get(this.model)["_find"]({
            where: {filename: {contains: s}, parent: null, group: group},
            sort: "createdAt DESC",
        }, {
            populate: [["variants", {sort: "createdAt DESC"}], ["meta", {}]],
            // This limitation is made strictly, if your code solves this please make a PR
            limit: 1000
        })


        for (let elem of data) {
            elem.variants = await populateVariants(this.adminizer, elem.variants, this.model)
        }

        return data;
    }

    public async setRelations(data: MediaManagerWidgetData[], model: string, modelId: string, widgetName: string,): Promise<void> {
        let modelAssociations = await this.adminizer.modelHandler.model.get(this.modelAssoc)["_find"]({
            where: {modelId: modelId, model: model, widgetName: widgetName},
        });

        for (const modelAssociation of modelAssociations) {
            const q: Record<string, any> = {};
            const pk = this.adminizer.modelHandler.model.get(this.modelAssoc).primaryKey;
            q[pk] = modelAssociation.id;
            await this.adminizer.modelHandler.model.get(this.modelAssoc)["_destroy"](q);
        }

        const fieldName = this.adminizer.ormAdapters[0].ormType === 'sequelize' ? 'fileId' : 'file';

        for (const [key, widgetItem] of data.entries()) {
            await this.adminizer.modelHandler.model.get(this.modelAssoc)["_create"]({
                mediaManagerId: this.id,
                model: model,
                modelId: modelId,
                [fieldName]: widgetItem.id,
                widgetName: widgetName,
                sortOrder: key + 1,
            });
        }
    }

    public async getItemsList(items: MediaManagerWidgetItem[]): Promise<MediaManagerWidgetClientItem[]> {
        let widgetItems: MediaManagerWidgetClientItem[] = [];
        for (const item of items) {
            //TODO refactor CRUD functions for DataAccessor usage
            let file: MediaManagerItem = (await this.adminizer.modelHandler.model.get(this.model)["_find"]({
                where: {id: item.id}
            }, {populate: [["variants", {sort: "createdAt DESC"}]]}))[0]

            widgetItems.push({
                id: file.id,
                mimeType: file.mimeType,
                url: file.url,
                variants: file.variants,
            });
        }
        return widgetItems;
    }
}
