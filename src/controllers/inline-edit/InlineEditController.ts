import { Adminizer } from '../../lib/Adminizer';
import { DataAccessor } from '../../lib/DataAccessor';
import { ControllerHelper } from '../../helpers/controllerHelper';
import { BaseFieldConfig } from '../../interfaces/adminpanelConfig';

/**
 * Request body for inline update
 */
interface InlineUpdateBody {
    /** Field name to update */
    field: string;
    /** New value for the field */
    value: any;
}

/**
 * Request body for batch inline update
 */
interface BatchInlineUpdateBody {
    /** Array of updates to apply */
    updates: Array<{
        /** Record ID */
        id: string | number;
        /** Field name to update */
        field: string;
        /** New value for the field */
        value: any;
    }>;
}

/**
 * Result of validation
 */
interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * InlineEditController handles inline editing of records in list view
 *
 * Features:
 * - Single field update for one record
 * - Batch updates for multiple records
 * - Validation based on field configuration
 * - Access rights checking
 */
export class InlineEditController {

    /**
     * Check authentication
     */
    private static checkAuth(req: ReqType, res: ResType): boolean {
        if (req.adminizer?.config?.auth?.enable && !req.user) {
            res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
            return false;
        }
        return true;
    }

    /**
     * PATCH /adminizer/model/:model/inline/:id
     * Update a single field of a record inline
     */
    static async update(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!InlineEditController.checkAuth(req, res)) return;

        try {
            const entity = ControllerHelper.findEntityObject(req);

            if (!entity.model) {
                return res.status(404).json({
                    success: false,
                    error: 'Model not found'
                });
            }

            const recordId = req.params.id;
            const { field, value } = req.body as InlineUpdateBody;

            // Validate request body
            if (!field || typeof field !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Field name is required'
                });
            }

            // Check update permission
            if (req.adminizer.config.auth?.enable) {
                if (!req.adminizer.accessRightsHelper.hasPermission(`update-${entity.name}-model`, req.user)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied'
                    });
                }
            }

            // Get DataAccessor for field configuration
            const dataAccessor = new DataAccessor(req.adminizer, req.user, entity, 'edit');
            const fieldsConfig = dataAccessor.getFieldsConfig();

            // Check if field exists
            if (!fieldsConfig[field]) {
                return res.status(400).json({
                    success: false,
                    error: `Field '${field}' not found in model`
                });
            }

            // Check if field is inline editable
            const fieldConfig = fieldsConfig[field].config as BaseFieldConfig;
            if (!fieldConfig.inlineEditable) {
                return res.status(403).json({
                    success: false,
                    error: `Field '${field}' is not inline editable`
                });
            }

            // Validate value
            const validation = InlineEditController.validateValue(field, value, fieldConfig, fieldsConfig[field].model);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }

            // Process value based on field type
            const processedValue = InlineEditController.processValue(value, fieldsConfig[field].model);

            // Find and update record
            const identifierField = entity.config?.identifierField || req.adminizer.config.identifierField || 'id';
            const updateParams: Record<string, any> = {};
            updateParams[identifierField] = recordId;

            const updateData: Record<string, any> = {};
            updateData[field] = processedValue;

            const updatedRecords = await entity.model.update(updateParams, updateData, dataAccessor);

            if (!updatedRecords || updatedRecords.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Record not found'
                });
            }

            Adminizer.log.debug(`InlineEdit: Record ${recordId} field '${field}' updated`);

            return res.json({
                success: true,
                data: {
                    id: recordId,
                    field,
                    value: processedValue,
                    record: updatedRecords[0]
                }
            });
        } catch (error: any) {
            Adminizer.log.error('InlineEditController.update error:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    /**
     * PATCH /adminizer/model/:model/inline/batch
     * Update multiple records at once
     */
    static async batchUpdate(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!InlineEditController.checkAuth(req, res)) return;

        try {
            const entity = ControllerHelper.findEntityObject(req);

            if (!entity.model) {
                return res.status(404).json({
                    success: false,
                    error: 'Model not found'
                });
            }

            const { updates } = req.body as BatchInlineUpdateBody;

            // Validate request body
            if (!Array.isArray(updates) || updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Updates array is required and must not be empty'
                });
            }

            // Limit batch size
            const MAX_BATCH_SIZE = 100;
            if (updates.length > MAX_BATCH_SIZE) {
                return res.status(400).json({
                    success: false,
                    error: `Batch size exceeds maximum of ${MAX_BATCH_SIZE} updates`
                });
            }

            // Check update permission
            if (req.adminizer.config.auth?.enable) {
                if (!req.adminizer.accessRightsHelper.hasPermission(`update-${entity.name}-model`, req.user)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied'
                    });
                }
            }

            // Get DataAccessor for field configuration
            const dataAccessor = new DataAccessor(req.adminizer, req.user, entity, 'edit');
            const fieldsConfig = dataAccessor.getFieldsConfig();
            const identifierField = entity.config?.identifierField || req.adminizer.config.identifierField || 'id';

            // Validate all updates first
            const errors: Array<{ index: number; id: string | number; error: string }> = [];

            for (let i = 0; i < updates.length; i++) {
                const update = updates[i];

                if (!update.id) {
                    errors.push({ index: i, id: update.id, error: 'Record ID is required' });
                    continue;
                }

                if (!update.field || typeof update.field !== 'string') {
                    errors.push({ index: i, id: update.id, error: 'Field name is required' });
                    continue;
                }

                if (!fieldsConfig[update.field]) {
                    errors.push({ index: i, id: update.id, error: `Field '${update.field}' not found` });
                    continue;
                }

                const fieldConfig = fieldsConfig[update.field].config as BaseFieldConfig;
                if (!fieldConfig.inlineEditable) {
                    errors.push({ index: i, id: update.id, error: `Field '${update.field}' is not inline editable` });
                    continue;
                }

                const validation = InlineEditController.validateValue(
                    update.field,
                    update.value,
                    fieldConfig,
                    fieldsConfig[update.field].model
                );
                if (!validation.valid) {
                    errors.push({ index: i, id: update.id, error: validation.error || 'Validation failed' });
                }
            }

            // If there are validation errors, return them
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation errors',
                    errors
                });
            }

            // Process all updates
            const results: Array<{ id: string | number; success: boolean; error?: string }> = [];

            for (const update of updates) {
                try {
                    const processedValue = InlineEditController.processValue(
                        update.value,
                        fieldsConfig[update.field].model
                    );

                    const updateParams: Record<string, any> = {};
                    updateParams[identifierField] = update.id;

                    const updateData: Record<string, any> = {};
                    updateData[update.field] = processedValue;

                    const updatedRecords = await entity.model.update(updateParams, updateData, dataAccessor);

                    if (updatedRecords && updatedRecords.length > 0) {
                        results.push({ id: update.id, success: true });
                    } else {
                        results.push({ id: update.id, success: false, error: 'Record not found' });
                    }
                } catch (error: any) {
                    results.push({ id: update.id, success: false, error: error.message });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            Adminizer.log.debug(`InlineEdit batch: ${successCount} succeeded, ${failCount} failed`);

            return res.json({
                success: failCount === 0,
                data: {
                    total: updates.length,
                    succeeded: successCount,
                    failed: failCount,
                    results
                }
            });
        } catch (error: any) {
            Adminizer.log.error('InlineEditController.batchUpdate error:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    /**
     * GET /adminizer/model/:model/inline/config
     * Get inline editing configuration for a model
     */
    static async getConfig(req: ReqType, res: ResType): Promise<ResType | void> {
        if (!InlineEditController.checkAuth(req, res)) return;

        try {
            const entity = ControllerHelper.findEntityObject(req);

            if (!entity.model) {
                return res.status(404).json({
                    success: false,
                    error: 'Model not found'
                });
            }

            // Check read permission
            if (req.adminizer.config.auth?.enable) {
                if (!req.adminizer.accessRightsHelper.hasPermission(`read-${entity.name}-model`, req.user)) {
                    return res.status(403).json({
                        success: false,
                        error: 'Access denied'
                    });
                }
            }

            // Get DataAccessor for field configuration
            const dataAccessor = new DataAccessor(req.adminizer, req.user, entity, 'list');
            const fieldsConfig = dataAccessor.getFieldsConfig();

            // Build list of inline editable fields
            const editableFields: Array<{
                field: string;
                type: string;
                title: string;
                validation?: BaseFieldConfig['inlineValidation'];
            }> = [];

            for (const [fieldName, fieldData] of Object.entries(fieldsConfig)) {
                const config = fieldData.config as BaseFieldConfig;
                if (config.inlineEditable) {
                    editableFields.push({
                        field: fieldName,
                        type: fieldData.model.type || 'string',
                        title: config.title || fieldName,
                        validation: config.inlineValidation
                    });
                }
            }

            return res.json({
                success: true,
                data: {
                    model: entity.name,
                    editableFields,
                    batchUpdateEnabled: true,
                    maxBatchSize: 100
                }
            });
        } catch (error: any) {
            Adminizer.log.error('InlineEditController.getConfig error:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    /**
     * Validate a value against field configuration
     */
    private static validateValue(
        fieldName: string,
        value: any,
        fieldConfig: BaseFieldConfig,
        modelField: any
    ): ValidationResult {
        const validation = fieldConfig.inlineValidation;
        const fieldType = modelField.type;

        // Check required
        if (fieldConfig.required && (value === null || value === undefined || value === '')) {
            return { valid: false, error: `${fieldName} is required` };
        }

        // Skip validation if value is null/undefined and not required
        if (value === null || value === undefined) {
            return { valid: true };
        }

        // Type-specific validation
        if (fieldType === 'string' || fieldType === 'text') {
            if (typeof value !== 'string') {
                return { valid: false, error: `${fieldName} must be a string` };
            }

            if (validation?.minLength && value.length < validation.minLength) {
                return { valid: false, error: `${fieldName} must be at least ${validation.minLength} characters` };
            }

            if (validation?.maxLength && value.length > validation.maxLength) {
                return { valid: false, error: `${fieldName} must be at most ${validation.maxLength} characters` };
            }

            if (validation?.pattern) {
                const regex = new RegExp(validation.pattern);
                if (!regex.test(value)) {
                    return { valid: false, error: `${fieldName} format is invalid` };
                }
            }
        }

        if (fieldType === 'number' || fieldType === 'integer' || fieldType === 'float') {
            const numValue = Number(value);
            if (isNaN(numValue)) {
                return { valid: false, error: `${fieldName} must be a number` };
            }

            if (validation?.min !== undefined && numValue < validation.min) {
                return { valid: false, error: `${fieldName} must be at least ${validation.min}` };
            }

            if (validation?.max !== undefined && numValue > validation.max) {
                return { valid: false, error: `${fieldName} must be at most ${validation.max}` };
            }
        }

        if (fieldType === 'boolean') {
            if (typeof value !== 'boolean' && value !== 'true' && value !== 'false' && value !== 0 && value !== 1) {
                return { valid: false, error: `${fieldName} must be a boolean` };
            }
        }

        // Custom validation function
        if (validation?.validate) {
            const result = validation.validate(value);
            if (result === false) {
                return { valid: false, error: `${fieldName} validation failed` };
            }
            if (typeof result === 'string') {
                return { valid: false, error: result };
            }
        }

        return { valid: true };
    }

    /**
     * Process value based on field type
     */
    private static processValue(value: any, modelField: any): any {
        const fieldType = modelField.type;

        if (value === null || value === undefined) {
            return null;
        }

        switch (fieldType) {
            case 'boolean':
                return value === true || value === 'true' || value === 1;

            case 'number':
            case 'integer':
                return parseInt(value, 10);

            case 'float':
                return parseFloat(value);

            case 'json':
                if (typeof value === 'string') {
                    try {
                        return JSON.parse(value);
                    } catch {
                        return value;
                    }
                }
                return value;

            default:
                return value;
        }
    }
}
