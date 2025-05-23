import { AdminizerConfig, AdminpanelConfig } from "../../src";

const models: AdminizerConfig["models"] = {
    test: {
        title: 'Test model',
        model: 'Test',
        userAccessRelation: 'userField',
        fields: {
            createdAt: false,
            updatedAt: false,
            title: {
                title: 'Title',
                type: 'string',
                required: true
            }
        },
        list: {
            fields: {
                userField: false,
            }
        },
        add: {
            fields: {
                ownerId: false,
                exampleId: false,
                guardedField: {
                    title: "Restricted Field",
                    groupsAccessRights: ["admin", "editor"]
                }
            }
        },
        edit: {
            fields: {
                guardedField: {
                    title: "Restricted Field",
                    groupsAccessRights: ["admin", "manager"]
                }
            }
        },
        icon: 'receipt'
    },
    example: {
        title: 'All controls',
        model: 'Example',
        fields: {
            createdAt: false,
            updatedAt: false,
            title: {
                title: 'Title',
                type: 'string',
                required: true
            },
            description: {
                title: 'Textarea',
                type: 'text',
                required: true,
                tooltip: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Hic, nisi.'
            },
            sort: {
                type: 'boolean',
                title: 'Boolean'
            },
            disabled_text: {
                title: 'Disabled',
                type: 'text',
                disabled: true,
                tooltip: 'This field should be disabled'
            },
            range: {
                type: 'range',
                title: 'Range',
                options: {
                    min: 10,
                    max: 80
                }
            },
            select: {
                title: 'Select',
                isIn: ['one', 'two', 'three']
            },
            date: {
                title: 'Date',
                type: 'date',
            },
            month: {
                title: 'Month',
                type: 'month',
            },
            datetime: {
                title: 'Date and time',
                type: 'datetime',
            },
            time: {
                title: 'time',
                type: 'time',
            },
            number: {
                title: 'Number',
                type: 'number',
            },
            color: {
                title: 'color',
                type: 'color',
            },
            week: {
                title: 'Week',
                type: 'week',
            },
            json: {
                type: 'jsoneditor'
            },
            tui: {
                type: 'tuieditor',
                options: {
                    name: 'toast-ui',
                    config: {
                        hideModeSwitch: true,
                        previewStyle: 'vertical',
                    },
                }
            },
            code: {
                title: 'Code',
                type: 'code',
                options: {
                    name: 'monaco',
                    config: {
                        language: 'typescript',
                    }
                }
            },
            geojson: {
                type: 'geo-polygon',
            },
            datatable: {
                title: 'Price',
                type: 'table',
                options: {
                    config: {
                        dataSchema: {name: null, footage: null, price: null},
                        colHeaders: ['One', 'Two', 'Three'],
                        columns: [
                            {data: 'name'},
                            {data: 'footage'},
                            {data: 'price'}
                        ],
                    }
                },
            },
            selectMany: {
                title: 'Select many',
                isIn: ['Sone', 'Stwo', 'Sthree', 'Sfour', 'Sfive'],
                type: 'select-many'
            },
            checkboxes: {
                title: 'Checkboxes',
                isIn: ['one', 'two', 'three']
            },
            editor: {
                title: 'Editor',
                type: 'wysiwyg',
                options: {
                    // name: 'react-quill',
                    name: 'ckeditor',
                    config: {
                        items: [
                            // 'sourceEditing', // This is for test, see full list of items in src/lib/controls/wysiwyg/CKeditor.ts
                            // 'showBlocks',
                            // '|',
                            'heading',
                            '|',
                            'bold',
                            'italic',
                            'underline',
                            '|',
                            // 'horizontalLine',
                            'link',
                            'insertImageViaUrl',
                            'insertTable',
                            'blockQuote',
                            '|',
                            'alignment',
                            '|',
                            'bulletedList',
                            'numberedList',
                            'outdent',
                            'indent',
                        ]
                    }
                }
            },
            testRelation: {
                title: 'Test one association',
                displayModifier: function (data) {
                    return data?.title;
                }
            },
            tests: {
                title: 'One to many association',
                displayModifier: function (data) {
                    return data?.title;
                }
            },
        },
        list: {
            fields: {
                json: false,
                tui: false,
                geojson: false,
                week: false,
                color: false,
                range: false,
                date: false,
                month: false,
                selectMany: false,
                select: false,
                dateTime: false,
                testRelation: false,
                tests: false,
                price: false,
                code: false,
                datatable: false
            },
        },
        icon: 'inbox'
    }
};

export const config: AdminpanelConfig = {
    routePrefix: "/admin",
    auth: {
        enable: true
    },
    administrator: {
        login: 'admin',
        password: 'admin'
    },
    models: models,
    showVersion: true,
};

