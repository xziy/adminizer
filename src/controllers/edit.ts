import {ControllerHelper} from "../helpers/controllerHelper";
import {RequestProcessor} from "../lib/requestProcessor";
import {FieldsHelper} from "../helpers/fieldsHelper";
import {BaseFieldConfig, CreateUpdateConfig, MediaManagerOptionsField} from "../interfaces/adminpanelConfig";
import { diff } from 'deep-object-diff';
import {
    getRelationsMediaManager,
    saveRelationsMediaManager
} from "../lib/media-manager/helpers/MediaManagerHelper";
import {DataAccessor} from "../lib/v4/DataAccessor";
import {Adminizer} from "../lib/Adminizer";
import inertiaAddHelper from "../helpers/inertiaAddHelper";
import {formatChanges, sanitizeForDiff} from "../helpers/diffHelpers";

export default async function edit(req: ReqType, res: ResType) {
    //Check id
    if (!req.params.id) {
        return res.status(404).send({error: 'Not Found'});
    }

    let entity = ControllerHelper.findEntityObject(req);
    if (!entity.model) {
        return res.status(404).send({error: 'Not Found'});
    }

    if (!entity.config.edit) {
        return res.redirect(`${req.adminizer.config.routePrefix}/${entity.uri}`);
    }

    if (req.adminizer.config.auth.enable) {
        if (!req.user) {
            return res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
        } else if (!req.adminizer.accessRightsHelper.hasPermission(`update-${entity.name}-model`, req.user)) {
            return res.sendStatus(403);
        }
    }

    let record;
    let dataAccessor;
    try {
        const id = req.params.id as string;
        dataAccessor = new DataAccessor(req.adminizer, req.user, entity, "edit");
        record = await entity.model.findOne({id: id}, dataAccessor);
        if (!record) return res.status(404).send("Adminpanel > Record not found");
    } catch (e) {
        Adminizer.log.error('Admin edit error: ');
        Adminizer.log.error(e);
        return res.status(500).send({error: 'Internal Server Error'});
    }

    let fields = dataAccessor.getFieldsConfig();

    // add deprecated 'records' to config
    fields = await FieldsHelper.loadAssociations(req, fields, "edit");

    // Save
    if (req.method.toUpperCase() === 'POST') {
        let reqData = RequestProcessor.processRequest(req, fields);
        let params: {
            [key: string]: number | string
        } = {};
        params[entity.config.identifierField || req.adminizer.config.identifierField] = req.params.id;

        /**
         * Here means reqData adapt for model data, but rawReqData is processed for widget processing
         */
        const rawReqData = {...reqData};

        for (let prop in reqData) {
            if (fields[prop].model.type === 'boolean') {
                reqData[prop] = Boolean(reqData[prop]);
            }

            if (Number.isNaN(reqData[prop]) || reqData[prop] === undefined || reqData[prop] === null) {
                delete reqData[prop]
            }

            if (reqData[prop] === "" && fields[prop].model.allowNull === true) {
                reqData[prop] = null
            }

            let fieldConfigConfig = fields[prop].config as BaseFieldConfig;


            // delete property from association-many and association if empty
            // TODO check if adding and deleting associations works for other orm (this code was written for waterline)
            if (fields[prop] && fields[prop].model && (fields[prop].model.type === 'association-many' || fields[prop].model.type === 'association')) {
                if (!reqData[prop] || !(reqData[prop] as string[]).length) {
                    reqData[prop] = fields[prop].model.type === 'association' ? null : [];
                } else {
                    if (fields[prop].model.type === 'association') {
                        reqData[prop] = (reqData[prop] as string[])[0]
                    }
                }
            }

            if (fieldConfigConfig.type === 'mediamanager' && typeof reqData[prop] === "string") {
                try {
                    const parsed = JSON.parse(reqData[prop] as string);
                    rawReqData[prop] = parsed
                } catch (error) {
                    throw `Error assign association-many mediamanager data for ${prop}, ${reqData[prop]}`
                }
                delete reqData[prop]
            }

            if (fields[prop] && fields[prop].model && fields[prop].model.type === 'json' && reqData[prop] !== '') {
                if (typeof reqData[prop] === "string") {
                    try {
                        reqData[prop] = JSON.parse(reqData[prop] as string);
                    } catch (e) {
                        if (typeof reqData[prop] === "string" && reqData[prop].toString().replace(/(\r\n|\n|\r|\s{2,})/gm, "")) {
                            Adminizer.log.error(JSON.stringify(reqData[prop]), e);
                        }
                    }
                }
            }

            // split string for association-many
            if (fields[prop] && fields[prop].model && fields[prop].model.type === 'association-many' && reqData[prop] && typeof reqData[prop] === "string") {
                reqData[prop] = reqData[prop].split(",")
            }

            // HardFix: Long string was split as array of strings. https://github.com/balderdashy/sails/issues/7262
            if (fields[prop].model.type === 'string' && Array.isArray(reqData[prop])) {
                reqData[prop] = (reqData[prop] as string[]).join("");
            }
        }

        // callback before save entity
        let entityEdit = entity.config.edit as CreateUpdateConfig;
        if (typeof entityEdit.entityModifier === "function") {
            reqData = entityEdit.entityModifier(reqData);
        }

        try {
            let newRecord = await entity.model.update(params, reqData, dataAccessor);
            await saveRelationsMediaManager(fields, rawReqData, entity.model.identity, newRecord[0].id)

            // Создаем clean объекты для сравнения (исключаем системные поля)
            const cleanOldRecord = sanitizeForDiff(record);
            const cleanNewRecord = sanitizeForDiff(newRecord[0]);

            // Получаем diff
            const changesDiff = diff(cleanOldRecord, cleanNewRecord);

            // Форматируем для лога
            const formattedChanges = formatChanges(changesDiff, cleanOldRecord, cleanNewRecord);

            // log system event notification
            await req.adminizer.logSystemUpdatedEvent(
                req.i18n.__('Updated'),
                `user ${req.user.login} ${req.i18n.__('update')} ${entity.name} ${record.id}`,
                {
                    changes: formattedChanges,
                    summary: `${req.i18n.__('Changes')} ${Object.keys(formattedChanges).length} ${req.i18n.__('fields')}`
                }
            );

            Adminizer.log.debug(`Record was updated: `, newRecord);
            if (req.body.jsonPopupCatalog) {
                return res.json({record: newRecord})
            } else {

                // update navigation tree after model updated
                if (req.adminizer.config.navigation) {
                    for (const section of req.adminizer.config.navigation.sections) {
                        let navigation = req.adminizer.catalogHandler.getCatalog('navigation')
                        navigation.setId(section)
                        let navItem = navigation.itemTypes.find(item => item.type === entity.name.toLowerCase())
                        if (navItem) {
                            await navItem.updateModelItems(newRecord[0].id, {record: newRecord[0]}, section)
                        }
                    }
                }

                req.flash.setFlashMessage('success', req.i18n.__('Record was updated'));
                return req.Inertia.redirect(`${req.adminizer.config.routePrefix}/model/${entity.name}`)
            }
        } catch (e) {
            Adminizer.log.error(e);
            req.session.messages.adminError.push(e.message || 'Something went wrong...');
            return e;
        }
    } // END POST

    for (const field of Object.keys(fields)) {
        let fieldConfigConfig = fields[field].config as BaseFieldConfig;
        if (fieldConfigConfig.type === 'mediamanager') {
            record[field] = await getRelationsMediaManager({
                list: record[field],
                mediaManagerId: (fieldConfigConfig.options as MediaManagerOptionsField)?.id ?? "default"
            })
        }
    }
    const props = inertiaAddHelper(req, entity, fields, record)
    if (req.query?.without_layout) {
        return res.json({
            props: props
        })
    } else {
        return req.Inertia.render({
            component: 'add',
            props: props
        })
    }
};
