import { Fields } from "../../../helpers/fieldsHelper";
import { MediaManagerHandler } from "../MediaManagerHandler";
import { MediaManagerWidgetData, MediaManagerItem, MediaManagerWidgetItem, MediaManagerWidgetJSON } from "../AbstractMediaManager"
import { BaseFieldConfig, MediaManagerOptionsField, ModelConfig } from "../../../interfaces/adminpanelConfig";
import {Adminizer} from "../../Adminizer";

type PostParams = Record<string, string | number | boolean | object | string[] | number[] | null>;

/**
 * Create a random file name with prefix and type. If prefix is true, the file name will be prefixed with a random string.
 * @param filenameOrig
 * @param type
 * @param prefix
 */
export function randomFileName(filenameOrig: string, type: string, prefix: boolean) {
	// make random string in end of file
	const prefixLength = 8;
	const randomPrefix = prefix ? Math.floor(Math.random() * Math.pow(36, prefixLength)).toString(36) : ''

	return filenameOrig.replace(/\.[^.]+$/, `_${randomPrefix}${type}$&`)
}

/**
 * Save media manager relations to database.
 * @param fields
 * @param reqData
 * @param model
 * @param recordId
 */
export async function saveRelationsMediaManager(fields: Fields, reqData: PostParams, model: string, recordId: string) {
	for (let prop in reqData) {
		let fieldConfigConfig = fields[prop].config as BaseFieldConfig;
		let options = fieldConfigConfig.options as MediaManagerOptionsField;
		if (fieldConfigConfig.type === 'mediamanager') {
			let data = reqData[prop] as MediaManagerWidgetData[];
			let mediaManager = MediaManagerHandler.get(options?.id ?? 'default')
			await mediaManager.setRelations(data, model, recordId, prop)
		}
	}
}

/*
* Get realtions
* @param data
*/
export async function getRelationsMediaManager(data: MediaManagerWidgetJSON) {
	let mediaManager = MediaManagerHandler.get(data.mediaManagerId)
	return await mediaManager.getRelations(data.list ?? [])
}

/*
* Delate Ralations
* @param model
* @param record
*/
export async function deleteRelationsMediaManager(adminizer: Adminizer, model: string, record: { [p: string]: string | MediaManagerWidgetItem[] }[]) {
	let config = adminizer.config.models[model] as ModelConfig
	for (const key of Object.keys(record[0])) {
		let field = config.fields[key] as BaseFieldConfig
		if (field && field.type === 'mediamanager') {
			const option = field.options as MediaManagerOptionsField
			let mediaManager = MediaManagerHandler.get(option?.id ?? 'default')
			let emptyData: MediaManagerWidgetData[] = []
			await mediaManager.setRelations(emptyData, model, record[0].id as string, key)
		}
	}
}

/**
 * @param adminizer
 * @param variants
 * @param model
 */
export async function populateVariants(adminizer: Adminizer, variants: MediaManagerItem[], model: string): Promise<MediaManagerItem[]> {
	let items: MediaManagerItem[] = []
	for (let variant of variants) {
		// TODO refactor CRUD functions for DataAccessor usage
		variant = await adminizer.modelHandler.model.get(model)["_findOne"]({ where: { id: variant.id } })
		items.push(variant)
	}
	return items;
}
