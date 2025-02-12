import {AdminpanelConfig} from "../dist/interfaces/adminpanelConfig";

const models: AdminpanelConfig["models"] = {
  test: {
    title: 'test Form example from file',
    model: 'test',
    tools: [
      {
        link: '/test/404',
        title: 'Some new action',
        icon: 'cat',
      },
      {
        link: '#',
        title: 'Form example',
        icon: 'beer',
        accessRightsToken: 'read-example-form'
      },
      {
        link: '#',
        title: 'Form example from file Form example from file',
        icon: 'beer',
        accessRightsToken: 'read-exampleFromFile-form'
      }
    ],
    fields: {
      title: {
        title: 'Title',
        tooltip: 'Item Description'
      },
      title_2: {
        title: 'Textarea',
        type: 'text'
      },
      test_ck5_1: {
        type: 'wysiwyg',
        tooltip: 'In the builds that contain toolbars an optimal default configuration is defined for it. You may need a different toolbar arrangement, though, and this can be achieved through configuration. Toolbar configuration is a strict UI-related setting. Removing a toolbar item does not remove the feature from the editor internals. If your goal with the toolbar configuration is to remove features, the right solution is to also remove their respective plugins. Check removing features for more information.',
        title: 'New Editor CKeditor 5',
        options: {
          ckeditor5: true, // CKeditor5 enabled/disabled
          removePlugins: [ // if you want to disable some plugins, list them separated by commas in this array
            'Style'
          ],
          // In the builds that contain toolbars an optimal default configuration is defined for it. You may need a different toolbar arrangement, though, and this can be achieved through configuration. Toolbar configuration is a strict UI-related setting. Removing a toolbar item does not remove the feature from the editor internals. If your goal with the toolbar configuration is to remove features, the right solution is to also remove their respective plugins. Check removing features for more information. More info https://ckeditor.com/docs/ckeditor5/latest/features/toolbar/toolbar.html
          toolbar: {
            items: [
              'heading',
              '|',
              'bold',
              'italic',
              'link',
              'bulletedList',
              'numberedList',
              '|',
              'removeFormat',
              '|',
              'outdent',
              'indent',
              '|',
              'imageUpload',
              'blockQuote',
              'insertTable',
              'undo',
              'redo',
              'htmlEmbed',
              'mediaEmbed',
              'alignment',
              'fontBackgroundColor',
              'fontColor',
              'fontFamily',
              'fontSize',
              'horizontalLine',
              'sourceEditing',
              'specialCharacters',
              'strikethrough',
              'subscript',
              'superscript',
              'underline'
            ]
          },
          // More info https://ckeditor.com/docs/ckeditor5/latest/features/images/images-styles.html#configuring-the-styles
          image: {
            toolbar: [
              'imageTextAlternative',
              'toggleImageCaption',
              'imageStyle:alignLeft',
              'imageStyle:alignRight',
              'imageStyle:alignBlockLeft',
              'imageStyle:alignCenter',
              'imageStyle:alignBlockRight',
              'linkImage'
            ]
          },
          // More info https://ckeditor.com/docs/ckeditor5/latest/features/table.html#toolbars
          table: {
            contentToolbar: [
              'tableColumn',
              'tableRow',
              'mergeTableCells',
              'tableCellProperties',
              'tableProperties'
            ]
          }
        }
      },
      sort: {
        type: 'boolean',
        title: 'Boolean'
      },
      sort_test: {
        type: 'boolean',
        title: 'Boolean'
      },
      image: {
        type: 'image',
        title: ' Image',
        options: {
          accepted: [
            'jpeg',
            'jpg',
            'webp'
          ],
          filesize: 2
        },
      },
      gallery: {
        type: 'images',
        title: 'Images',
        options: {
          accepted: [
            'jpeg',
            'jpg',
            'webp'
          ],
          filesize: 2
        },
      },
      file: {
        type: 'files',
        options: {
          filesize: 2,
          accepted: ['pdf', 'docx']
        }
      },
      range: {
        type: 'range',
        options: {
          min: -5,
          max: 360
        }
      },
      json: {
        type: 'jsoneditor'
      },
      tui: {
        type: 'tuieditor',
        options: {
          hideModeSwitch: false,
        }
      },
      ace: {
        type: 'ace'
      },
      datatable: {
        title: 'Price',
        type: 'table',
        options: {
          dataSchema: {name: null, footage: null, price: null},
          colHeaders: ['One', 'Two', 'Three'],
          rowHeaders: true,
          columns: [
            {data: 'name'},
            {data: 'footage'},
            {data: 'price'}
          ],
          height: 'auto',
          width: 'auto',
          manualColumnResize: true,
          contextMenu: true,
          language: 'en_EN',
          licenseKey: 'non-commercial-and-evaluation', // for non-commercial use only
        },
      },
      geojson: {
        type: 'geo-polygon',
      },
      examples: {
        displayModifier: function (data) {
          return data.title;
        }
      },
      select: {
        isIn: ['one', 'two', 'three']
      },
      date: {
        title: 'Date',
        type: 'date',
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
        title: 'number',
        type: 'number',
      },
      color: {
        title: 'color',
        type: 'color',
      },
      week: {
        type: 'week',
      },
      schedule: {
        title: 'Schedule Editor',
        type: 'worktime',
        options: {
          propertyList: {
            title: {
              type: 'string',
              title: 'Title',
              description: 'this is the title',
              required: 'true',
            },
            checkmark: {
              type: 'boolean',
              title: 'Checkmark',
              description: 'this is the checkmark',
            },
            hint: {
              type: 'string',
              title: 'Hint',
              description: 'this is the hint',
            },
            link: {
              type: 'string',
              title: 'Link',
              description: 'this is the link',
            },
            age: {
              type: 'number',
              title: 'Age',
              description: 'this is the age',
            },
          },
          permutations: {
            time: true,
            date: true,
            break: true,
            options: true,
          }
        }
      },
      guardedField: {
        title: 'Guarded field',
        // groupsAccessRights: ["admins"]
      },
      createdAt: false,
      updatedAt: false,
    },
    add: {
      fields: {},
    },
    edit: {
      fields: {},
    },
    list: {
      fields: {},
      actions: {
        global: [
          {
            link: 'https://www.google.com.ua/',
            title: 'Google',
            icon: 'external-link-square-alt'
          }
        ],
        inline: [
          {
            link: 'https://www.google.com.ua/',
            title: 'Google',
            icon: 'external-link-square-alt'
          }, {
            link: 'https://www.google.com.ua/',
            title: 'Google2',
            icon: 'external-link-square-alt'
          }, {
            link: 'https://www.google.com.ua/',
            title: 'Google3',
            icon: 'external-link-square-alt'
          }, {
            link: 'https://www.google.com.ua/',
            title: 'Google4',
            icon: 'external-link-square-alt'
          },
        ]
      }
    },
    icon: 'flask',
  },
  example: {
    title: 'Exapmle Form example from file',
    model: 'example',
    fields: {
      owner: false,
      id: false,
      createdAt: false,
      updatedAt: false,
      title: 'Title',
      gallery: {
        type: 'images',
        options: {
          accepted: [
            'jpeg',
            'jpg',
            'webp'
          ],
          filesize: 2
        },
      },
      files: {
        type: 'files',
        options: {
          accepted: [
            'docx'
          ],
          filesize: 2
        },
      },
    },
    list: {
      fields: {
        gallery: false,
        files: false
      },
      actions: {
        global: [
          {
            link: 'https://www.google.com.ua/',
            title: 'Google',
            icon: 'external-link-square-alt'
          }
        ],
        inline: [
          {
            link: 'https://www.google.com.ua/',
            title: 'Google',
            icon: 'external-link-square-alt'
          }, {
            link: 'https://www.google.com.ua/',
            title: 'Google2',
            icon: 'external-link-square-alt'
          }, {
            link: 'https://www.google.com.ua/',
            title: 'Google3',
            icon: 'external-link-square-alt'
          }, {
            link: 'https://www.google.com.ua/',
            title: 'Google4',
            icon: 'external-link-square-alt'
          },
        ]
      }
    },
    icon: 'cat'
  },
  jsonschema: {
    title: 'Json schema',
    model: 'jsonschema',
    fields: {
      data: {
        type: 'json',
        options: {
          default: [],
          schema: {
            'type': 'array',
            'items': {
              '$ref': '#/definitions/badge'
            },
            'definitions': {
              'badge': {
                'type': 'object',
                'additionalProperties': false,
                'properties': {
                  'text': {
                    'type': 'string',
                    'minLength': 3,
                    'maxLength': 18
                  },
                  'color': {
                    'type': 'string',
                    'pattern': '^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$'
                  },
                  'textColor': {
                    'type': 'string',
                    'pattern': '^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$'
                  }
                },
                'required': [
                  'color',
                  'text',
                  'textColor'
                ]
              }
            }
          },
          modes: ['code', 'form', 'text', 'tree', 'view'],
          mode: 'tree',
          templates: [
            {
              text: 'Gray badge',
              title: 'Insert a gray badge',
              value: {text: 'Gray badge', color: '#808080', textColor: '#FFFFFF'}
            },
            {
              text: 'Silver badge',
              title: 'Insert a silver badge',
              value: {text: 'Silver badge', color: '#C0C0C0', textColor: '#000000'}
            },
            {
              text: 'White badge',
              title: 'Insert a white badge',
              value: {text: 'White badge', color: '#FFFFFF', textColor: '#000000'}
            },
            {
              text: 'Fuchsia badge',
              title: 'Insert a fuchsia badge',
              value: {text: 'Fuchsia badge', color: '#FF00FF', textColor: '#000000'}
            },
            {
              text: 'Purple badge',
              title: 'Insert a purple badge',
              value: {text: 'Purple badge', color: '#800080', textColor: '#FFFFFF'}
            },
            {
              text: 'Maroon badge',
              title: 'Insert a maroon badge',
              value: {text: 'Maroon badge', color: '#800000', textColor: '#FFFFFF'}
            },
            {
              text: 'Yellow badge',
              title: 'Insert a yellow badge',
              value: {text: 'Yellow badge', color: '#FFFF00', textColor: '#000000'}
            },
            {
              text: 'Olive badge',
              title: 'Insert an olive badge',
              value: {text: 'Olive badge', color: '#808000', textColor: '#FFFFFF'}
            },
            {
              text: 'Lime badge',
              title: 'Insert a lime badge',
              value: {text: 'Lime badge', color: '#00FF00', textColor: '#000000'}
            },
            {
              text: 'Green badge',
              title: 'Insert a green badge',
              value: {text: 'Green badge', color: '#008000', textColor: '#FFFFFF'}
            },
            {
              text: 'Aqua badge',
              title: 'Insert an aqua badge',
              value: {text: 'Aqua badge', color: '#00FFFF', textColor: '#000000'}
            },
            {
              text: 'Teal badge',
              title: 'Insert a teal badge',
              value: {text: 'Teal badge', color: '#008080', textColor: '#FFFFFF'}
            },
            {
              text: 'Blue badge',
              title: 'Insert a blue badge',
              value: {text: 'Blue badge', color: '#0000FF', textColor: '#FFFFFF'}
            },
            {
              text: 'Navy badge',
              title: 'Insert a navy badge',
              value: {text: 'Navy badge', color: '#000080', textColor: '#FFFFFF'}
            }
          ]
        },
      }
    },
    icon: 'gear'
  }
};

export default {
  routePrefix: "/adminizer",
  // auth: true,
  dashboard: true,
  forms: {
    path: 'forms',
    data: {
      global: {
        field1: {
          title: 'Field1',
          type: 'string',
          value: 'Some string',
          required: true,
          tooltip: 'tooltip for field1',
          description: 'some description'
        },
        gallery: {
          title: 'Images',
          type: 'images',
          options: {
            accepted: [
              'jpeg',
              'jpg',
              'webp'
            ],
            filesize: 2
          },
        },
      }
    }
  },
  navbar: {
    additionalLinks: [{
      id: 4,
      link: '/admin/form/global',
      title: 'Global Settings',
      icon: 'wrench',
      accessRightsToken: 'read-global-form'
    }]
  },
  sections: [
    {
      id: "0",
      title: 'Website 1',
      link: '#',
      icon: 'mask',
      subItems: [
        {
          id: "0",
          title: 'Sub 1',
          link: 'https://webresto.org',
          icon: 'cat'
        },
        {
          id: "1",
          title: 'Sub 2',
          link: '#',
          icon: 'mask'
        },
        {
          id: "2",
          title: 'Sub 3 Sub 3 Sub 3 Sub 3',
          link: '#',
          icon: 'flask'
        },
        {
          id: "3",
          title: 'Sub 4',
          link: '#',
          icon: 'cat'
        }
      ]
    },
    {
      id: "1",
      title: 'Website 2 Website 2 Website 2',
      link: 'https://webresto.org',
      icon: 'mask'
    },
    {
      id: "2",
      title: 'Website 3',
      link: 'https://webresto.org',
      icon: 'mask'
    },
    {
      id: "3",
      title: 'Website 1',
      link: 'https://webresto.org',
      icon: 'mask'
    },
    {
      id: "4",
      title: 'Website 2 Website 2 Website 2',
      link: 'https://webresto.org',
      icon: 'mask'
    },
  ],
  brand: {
    link: {
      title: 'WebResto adminpanel',
      link: 'https://webresto.org',
    }
  },
  welcome: {
    title: 'Webresto adminpanel project',
    text: 'restaurant and delivery food solution www.webresto.org'
  },
  administrator: {
    login: process.env.ADMIN_LOGIN === undefined ? 'admin' : process.env.ADMIN_LOGIN,
    password: process.env.ADMIN_PASS === undefined ? '45345345FF38' : process.env.ADMIN_PASS
  },
  translation: {
    locales: ['en', 'ru', 'de', 'ua'],
    path: 'config/locales/adminpanel', // relative path to translations directory
    defaultLocale: 'en'
  },
  models: models,
  generator: {},
  globalSettings: { // Global project settings
    enableMigrations: true
  },
  migrations: {
    path: 'mg_path', // path to migrations
    //config: string | object // db-migrate config
  }
};
