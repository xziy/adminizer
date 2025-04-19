type ErrorState = {
    hasError: boolean;
    message?: string;
};

type FormState = {
    errors: Record<string, ErrorState>;
};

const formState: FormState = {
    errors: {},
};

const formStateProxy = new Proxy(formState, {
    set(target, property, value) {
        if (property === 'errors') {

            if (Object.keys(value).length === 0) {
                // Reset all errors
                target.errors = {};
            } else {
                // Update specific errors
                target.errors = { ...target.errors, ...value };
            }
            // console.log('Form errors updated:', target.errors);
            // window.dispatchEvent(new CustomEvent('formStateChanged'));
        }
        return true;
    },
});

export const setFieldError = (fieldName: string, hasError: boolean, message?: string) => {
    if (!hasError) {
        // If clearing error, remove it from the errors object
        const { [fieldName]: _, ...rest } = formStateProxy.errors;
        formStateProxy.errors = rest;
    } else {
        formStateProxy.errors = {
            ...formStateProxy.errors,
            [fieldName]: {
                hasError: true,
                message
            },
        };
    }
};

export const getFieldError = (fieldName: string): string | undefined => {
    return formStateProxy.errors[fieldName]?.message;
};

export const hasFormErrors = (): boolean => {
    return Object.values(formStateProxy.errors).some(error => error.hasError);
};

export const resetFormErrors = () => {
    formStateProxy.errors = {};
};
