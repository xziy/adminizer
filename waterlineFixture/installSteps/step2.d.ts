import InstallStepAbstract from "../../dist/lib/installStepper/InstallStepAbstract";
export default class Step2 extends InstallStepAbstract {
    canBeSkipped: boolean;
    description: string;
    ejsPath: string;
    id: string;
    scriptsUrl: string;
    sortOrder: number;
    groupSortOrder: number;
    stylesUrl: string;
    title: string;
    badge: string;
    isSkipped: boolean;
    renderer: "jsonforms";
    isProcessed: boolean;
    payload: {
        type: string;
        data: {
            name: string;
            vegetarian: boolean;
            birthDate: string;
            personalData: {
                age: number;
            };
            postalCode: string;
        };
        jsonSchema: {
            type: string;
            properties: {
                name: {
                    type: string;
                    minLength: number;
                    description: string;
                };
                vegetarian: {
                    type: string;
                };
                birthDate: {
                    type: string;
                    format: string;
                };
                nationality: {
                    type: string;
                    enum: string[];
                };
                personalData: {
                    type: string;
                    properties: {
                        age: {
                            type: string;
                            description: string;
                        };
                        height: {
                            type: string;
                        };
                        drivingSkill: {
                            type: string;
                            maximum: number;
                            minimum: number;
                            default: number;
                        };
                    };
                    required: string[];
                };
                occupation: {
                    type: string;
                };
                postalCode: {
                    type: string;
                    maxLength: number;
                };
            };
            required: string[];
        };
        uiSchema: {
            type: string;
            elements: ({
                type: string;
                text: string;
                elements?: undefined;
            } | {
                type: string;
                elements: ({
                    type: string;
                    scope: string;
                    options?: undefined;
                } | {
                    type: string;
                    scope: string;
                    options: {
                        suggestion: string[];
                    };
                })[];
                text?: undefined;
            })[];
        };
    };
    check(): Promise<boolean>;
    process(data: any, context: any): Promise<void>;
    skip(): Promise<void>;
    finally(): Promise<void>;
}
