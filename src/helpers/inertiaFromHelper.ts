import {PropsField} from "../interfaces/types";
import {
    AdminpanelConfig
} from "../interfaces/adminpanelConfig";
import {inputText, setSelectMany, getControlsOptions, PropsFieldType} from "./inertiaAddHelper";
import {ControlType} from "../lib/controls/AbstractControls";

interface FormProps extends Record<string | number | symbol, unknown> {
    fields: PropsField[],
    btnSave: {
        title: string;
    },
    postLink: string,
}

export default function inertiaFormHelper(req: ReqType, postLink: string, formData: AdminpanelConfig["forms"]["data"][0] ) {
    let props: FormProps = {
        fields: [],
        btnSave: {
            title: req.i18n.__('Save')
        },
        postLink: postLink
    }

    for (const key of Object.keys(formData)) {
        let field = formData[key];

        if (!!field.visible === false) continue

        const type = (field.type || field.type).toLowerCase()
        const isIn = field.isIn as string[] ?? []

        let label = field.title ?? ''
        let tooltip = field.tooltip ?? ''
        let name = key
        let fieldType: PropsFieldType = 'text'
        let disabled = false
        let required = field.required ?? false
        let options: Record<string, unknown> | Record<string, unknown>[] = {}
        let value = field.value ?? undefined

        if (['string', 'password', 'date', 'datetime', 'time', 'integer', 'number', 'float', 'email', 'month', 'week', 'range'].includes(type)) {
            fieldType = inputText(type, isIn)
            if (type === 'range') {
                options = {...field.options}
                if ("min" in field.options) {
                    value = value ? value : field.options.min ? field.options.min : 0
                }
            }
        }

        if (type === 'color') {
            fieldType = 'color'
            value = value ?? '#000000'
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

        if(type === 'select-many'){
            fieldType = 'select-many'
            const {initValue, initOptions} = setSelectMany(isIn, value as string[])
            options = initOptions
            value = initValue
        }

        if (['ckeditor', 'wysiwyg', 'texteditor', 'word'].includes(type)) {
            fieldType = 'wysiwyg';

            options = getControlsOptions(field, req, fieldType as ControlType, 'ckeditor')
        }

        if (['tui', 'tuieditor', 'toast-ui'].includes(type)) {
            fieldType = 'markdown';
            options = getControlsOptions(field, req, fieldType as ControlType, 'toast-ui')
        }

        if (type === 'table') {
            fieldType = 'table';
            options = getControlsOptions(field, req, fieldType as ControlType, 'handsontable')
        }
        if (['jsoneditor', 'json', 'array', 'object'].includes(type)) {
            fieldType = 'jsonEditor';
            options = getControlsOptions(field, req, fieldType as ControlType, 'jsoneditor')
        }

        if (['ace', 'html', 'xml', 'aceeditor', 'code'].includes(type)) {
            fieldType = 'codeEditor';
            options = getControlsOptions(field, req, fieldType as ControlType, 'monaco')
        }

        if (['geojson', 'geo-polygon', 'geo-marker'].includes(type)) {
            fieldType = 'geoJson';
            options = getControlsOptions(field, req, fieldType as ControlType, 'leaflet')
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
