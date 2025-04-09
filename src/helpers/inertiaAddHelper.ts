import {Entity, PropsField} from "../interfaces/types";
import inertiaActionsHelper, {Actions} from "./inertiaActionsHelper";
import {Fields, Field} from "./fieldsHelper";
import {BaseFieldConfig, WysiwygOptions} from "../interfaces/adminpanelConfig";
import {ControlsHandler} from "../lib/controls/ControlsHandler";
import {AbstractControls} from "../lib/controls/AbstractControls";
import chalk from "chalk";

interface listProps extends Record<string | number | symbol, unknown> {
    edit: boolean;
    view: boolean;
    actions: Actions[],
    btnBack: {
        title: string;
        link: string;
    },
    fields: PropsField[],
    btnSave: {
        title: string;
    },
    postLink: string,
}

export default function inertiaAddHelper(req: ReqType, entity: Entity, fields: Fields, record?: Record<string, string | boolean | number>, view: boolean = false) {
    const actionType = 'add';
    let props: listProps = {
        edit: !!record,
        view: view,
        actions: [],
        btnBack: {
            title: req.i18n.__('Back'),
            link: entity.uri
        },
        fields: [],
        btnSave: {
            title: req.i18n.__('Save')
        },
        postLink: record ? `${entity.uri}/edit/${record.id}` : `${entity.uri}/add`,
    }
    props.actions = inertiaActionsHelper(actionType, entity, req)

    const config = req.adminizer.configHelper.getConfig();

    for (const key of Object.keys(fields)) {
        if ((!config.showORMtime) && (key === 'createdAt' || key === 'updatedAt')) continue
        let field = fields[key] as Field
        let fieldConfig = field.config as BaseFieldConfig
        const type = (fieldConfig.type || fieldConfig.type).toLowerCase()

        //@ts-ignore TODO: fix model validations
        const isIn = typeof fieldConfig.isIn === 'object' ? fieldConfig.isIn : (field.model && typeof {...field.model.validations}.isIn === 'object' ? {...field.model.validations}.isIn : [])

        let label = fieldConfig.title ?? ''
        let tooltip = fieldConfig.tooltip ?? ''
        let name = key
        let fieldType = ''
        let disabled = false
        let required = fieldConfig.required ?? false
        let options = {}
        let value = record ? record[key] : undefined

        //@ts-ignore TODO: fix field type
        if (entity.config.model && req.adminizer.configHelper.isId(field, entity.config.model)) {
            disabled = true
        }

        if (['string', 'password', 'date', 'datetime', 'time', 'integer', 'number', 'float', 'color', 'email', 'month', 'week', 'range'].includes(type)) {
            fieldType = inputText(type, isIn)
            if (type === 'range') {
                options = {...fieldConfig.options}
                if ("min" in fieldConfig.options) {
                    value = record ? record[key] : fieldConfig.options.min ? fieldConfig.options.min : 0
                }
            }
        }

        if (type === 'select') {
            fieldType = 'select'
        }

        if (type === 'boolean' || type === 'binary') {
            fieldType = 'checkbox'
        }

        if (['text', 'longtext', 'mediumtext'].includes(type)) {
            fieldType = 'textarea'
        }

        if (['ckeditor', 'wysiwyg', 'texteditor', 'word'].includes(type)) {
            fieldType = 'wysiwyg';

            const editorOptions = fieldConfig?.options as WysiwygOptions;
            let editor: AbstractControls;

            if (editorOptions?.name) {
                editor = req.adminizer.controlsHandler.get('wysiwyg', editorOptions.name);
                if (!editor) {
                    console.log(chalk.yellow(`Wysiwyg editor ${editorOptions.name} not found, falling back to ckeditor`));
                    editor = req.adminizer.controlsHandler.get('wysiwyg', 'ckeditor');
                }
                options = {
                    config: editor.getConfig(),
                    path: editor.getPath()
                }
            } else {
                editor = req.adminizer.controlsHandler.get('wysiwyg', 'ckeditor');
                options = editorOptions?.items ? editorOptions : editor?.getConfig();
            }
            console.log(options)
        }

        props.fields.push({
            label: label,
            tooltip: tooltip,
            name: name,
            type: fieldType,
            value: value,
            disabled: disabled,
            required: required,
            isIn: isIn,
            options: options
        })
    }

    return props
}

function inputText(type: string, isIn: string[]) {
    if (type === "string" && isIn.length) {
        return "select"
    } else {
        switch (type) {
            case "password":
                return "password"
            case "date":
                return "date"
            case "datetime":
                return "datetime-local"
            case "time":
                return "time"
            case "color":
                return "color"
            case "email":
                return "email"
            case "month":
                return "month"
            case "week":
                return "week"
            case "range":
                return "range"
            case "integer":
            case "number":
            case "float":
                return "number"
            default:
                return "text"
        }
    }
}
