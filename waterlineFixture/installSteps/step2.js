import InstallStepAbstract from "../../dist/lib/installStepper/InstallStepAbstract";
const schema = {
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "minLength": 3,
            "description": "Please enter your name"
        },
        "vegetarian": {
            "type": "boolean"
        },
        "birthDate": {
            "type": "string",
            "format": "date"
        },
        "nationality": {
            "type": "string",
            "enum": [
                "DE",
                "IT",
                "JP",
                "US",
                "RU",
                "Other"
            ]
        },
        "personalData": {
            "type": "object",
            "properties": {
                "age": {
                    "type": "integer",
                    "description": "Please enter your age."
                },
                "height": {
                    "type": "number"
                },
                "drivingSkill": {
                    "type": "number",
                    "maximum": 10,
                    "minimum": 1,
                    "default": 7
                }
            },
            "required": [
                "age",
                "height"
            ]
        },
        "occupation": {
            "type": "string"
        },
        "postalCode": {
            "type": "string",
            "maxLength": 5
        }
    },
    "required": [
        "occupation",
        "nationality"
    ]
};
const uiSchema = {
    "type": "VerticalLayout",
    "elements": [
        {
            "type": "HorizontalLayout",
            "elements": [
                {
                    "type": "Control",
                    "scope": "#/properties/name"
                },
                {
                    "type": "Control",
                    "scope": "#/properties/personalData/properties/age"
                },
                {
                    "type": "Control",
                    "scope": "#/properties/birthDate"
                }
            ]
        },
        {
            "type": "Label",
            "text": "Additional Information"
        },
        {
            "type": "HorizontalLayout",
            "elements": [
                {
                    "type": "Control",
                    "scope": "#/properties/personalData/properties/height"
                },
                {
                    "type": "Control",
                    "scope": "#/properties/nationality"
                },
                {
                    "type": "Control",
                    "scope": "#/properties/occupation",
                    "options": {
                        "suggestion": [
                            "Accountant",
                            "Engineer",
                            "Freelancer",
                            "Journalism",
                            "Physician",
                            "Student",
                            "Teacher",
                            "Other"
                        ]
                    }
                }
            ]
        }
    ]
};
export default class Step2 extends InstallStepAbstract {
    canBeSkipped = false;
    description = 'JSON Forms example https://jsonforms.io/examples/basic';
    ejsPath = "";
    id = 'step2';
    scriptsUrl = '';
    sortOrder = 0;
    groupSortOrder = 1;
    stylesUrl = '';
    title = 'Example step 2';
    badge = 'step2';
    isSkipped = false;
    renderer = "jsonforms";
    isProcessed = false;
    payload = {
        type: "multi",
        data: {
            "name": "John Doe",
            "vegetarian": false,
            "birthDate": "1985-06-02",
            "personalData": {
                "age": 34
            },
            "postalCode": "12345"
        },
        jsonSchema: schema,
        uiSchema: uiSchema
    };
    async check() {
        return this.isProcessed;
    }
    async process(data, context) {
        this.isProcessed = true;
    }
    async skip() {
        this.isProcessed = true;
    }
    async finally() {
        await (new Promise((resolve) => setTimeout(resolve, 35000)));
    }
}
