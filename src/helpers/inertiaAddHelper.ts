import {Entity, PropsField} from "../interfaces/types";
import inertiaActionsHelper, {Actions} from "./inertiaActionsHelper";
import {Fields, Field} from "./fieldsHelper";
import {BaseFieldConfig, TuiEditorOptions, WysiwygOptions} from "../interfaces/adminpanelConfig";
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
        let options: Record<string, unknown> = {}
        let value = record ? record[key] : undefined

        //@ts-ignore TODO: fix field type
        if (entity.config.model && req.adminizer.configHelper.isId(field, entity.config.model)) {
            disabled = true
        }

        if (['string', 'password', 'date', 'datetime', 'time', 'integer', 'number', 'float', 'email', 'month', 'week', 'range'].includes(type)) {
            fieldType = inputText(type, isIn)
            if (type === 'range') {
                options = {...fieldConfig.options}
                if ("min" in fieldConfig.options) {
                    value = record ? record[key] : fieldConfig.options.min ? fieldConfig.options.min : 0
                }
            }
        }

        if (type === 'color') {
            fieldType = inputText(type, isIn)
            value = record ? (record[key] ? record[key] : '#000000') : '#000000'
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

            const fieldOptions = fieldConfig?.options as WysiwygOptions;
            let editor: AbstractControls;
            let editorName = 'ckeditor'; // default editor name

            // Determine which editor to use
            if (fieldOptions?.name) {
                editorName = fieldOptions.name;
            }

            // Get the editor instance
            editor = req.adminizer.controlsHandler.get('wysiwyg', editorName);

            // Fallback to ckeditor if specified editor not found
            if (!editor && editorName !== 'ckeditor') {
                console.log(chalk.yellow(`Wysiwyg editor ${editorName} not found, falling back to ckeditor`));
                editorName = 'ckeditor';
                editor = req.adminizer.controlsHandler.get('wysiwyg', editorName);
            }

            // Prepare options object
            options = {
                name: editorName,
                config: editor?.getConfig() || {},
                path: editor?.getPath() || {},
            };

            // If items are provided, use them instead of the editor's config
            if (fieldOptions?.config?.items && editorName === 'ckeditor') {
                options.config = {items: fieldOptions.config.items};
            }
        }

        if(['tui', 'tuieditor', 'toast-ui'].includes(type)){
            fieldType = 'markdown';

            const fieldOptions = fieldConfig?.options as TuiEditorOptions;
            let editor: AbstractControls;
            let editorName = 'toast-ui'; // default editor name

            // Determine which editor to use
            if (fieldOptions?.name) {
                editorName = fieldOptions.name;
            }
            // Get the editor instance
            editor = req.adminizer.controlsHandler.get('markdown', editorName);

            // Fallback to ckeditor if specified editor not found
            if (!editor && editorName !== 'toast-ui') {
                console.log(chalk.yellow(`Wysiwyg editor ${editorName} not found, falling back to toast-ui`));
                editorName = 'toast-ui';
                editor = req.adminizer.controlsHandler.get('markdown', editorName);
            }
            options = {
                name: editorName,
                config: {
                    ...(editor?.getConfig() || {}), // Base config of the editor
                    ...(fieldOptions?.config || {}), // Additional config provided in the field config
                },
                path: editor?.getPath() || {},
            };
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
