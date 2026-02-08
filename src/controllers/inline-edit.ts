import { ControllerHelper } from "../helpers/controllerHelper";
import { DataAccessor } from "../lib/DataAccessor";
import { Adminizer } from "../lib/Adminizer";
import { BaseFieldConfig } from "../interfaces/adminpanelConfig";

type InlineValidationResult = {
  value?: unknown;
  error?: string;
};

type BatchUpdateRequest = {
  id: string | number;
  fieldName: string;
  value: unknown;
};

type BatchUpdateResult = {
  id?: string | number;
  fieldName?: string;
  value?: unknown;
  error?: string;
  status?: number;
};

export default async function inlineEdit(req: ReqType, res: ResType) {
  let entity;
  try {
    entity = ControllerHelper.findEntityObject(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Entity not found";
    return res.status(404).json({ success: false, error: message });
  }

  if (!entity?.model) {
    return res.status(404).json({ success: false, error: "Model not found" });
  }

  if (req.adminizer.config.auth.enable) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (!req.adminizer.accessRightsHelper.hasPermission(`update-${entity.name}-model`, req.user)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
  }

  const fieldName = String(req.params.fieldName ?? "").trim();
  const recordId = String(req.params.id ?? "").trim();

  if (!fieldName || !recordId) {
    return res.status(400).json({ success: false, error: "Field name and id are required" });
  }

  const listAccessor = new DataAccessor(req.adminizer, req.user, entity, "list");
  const listFields = listAccessor.getFieldsConfig();
  const listField = listFields?.[fieldName];
  if (!listField) {
    return res.status(404).json({ success: false, error: "Field not found" });
  }

  const listFieldConfig = listField.config as BaseFieldConfig;
  if (!listFieldConfig?.inlineEditable) {
    return res.status(403).json({ success: false, error: "Field is not editable inline" });
  }

  const editAccessor = new DataAccessor(req.adminizer, req.user, entity, "edit");
  const editFields = editAccessor.getFieldsConfig();
  if (!editFields?.[fieldName]) {
    return res.status(403).json({ success: false, error: "Field is not editable" });
  }

  const { value } = req.body ?? {};
  const validation = validateInlineValue(value, listFieldConfig);

  if (validation.error) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const identifierField =
    entity.config?.identifierField
    ?? req.adminizer.config.identifierField
    ?? entity.model.primaryKey
    ?? "id";
  const identifierKey = typeof identifierField === "string"
    ? identifierField
    : String(identifierField);

  try {
    const updated = await entity.model.updateOne(
      { [identifierKey]: recordId },
      { [fieldName]: validation.value },
      editAccessor
    );

    if (!updated) {
      return res.status(404).json({ success: false, error: "Record not found" });
    }

    const updatedRecord = updated as Record<string, unknown>;

    return res.json({
      success: true,
      data: {
        [identifierKey]: resolveRecordId(updatedRecord[identifierKey], recordId),
        [fieldName]: updatedRecord[fieldName]
      }
    });
  } catch (error) {
    Adminizer.log.error(error);
    const message = error instanceof Error ? error.message : "Inline update failed";
    return res.status(500).json({ success: false, error: message });
  }
}

export async function inlineEditBatch(req: ReqType, res: ResType) {
  let entity;
  try {
    entity = ControllerHelper.findEntityObject(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Entity not found";
    return res.status(404).json({ success: false, error: message });
  }

  if (!entity?.model) {
    return res.status(404).json({ success: false, error: "Model not found" });
  }

  if (req.adminizer.config.auth.enable) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (!req.adminizer.accessRightsHelper.hasPermission(`update-${entity.name}-model`, req.user)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
  }

  const updates = (req.body?.updates ?? []) as BatchUpdateRequest[];
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ success: false, error: "Updates array is required" });
  }

  const listAccessor = new DataAccessor(req.adminizer, req.user, entity, "list");
  const listFields = listAccessor.getFieldsConfig();
  const editAccessor = new DataAccessor(req.adminizer, req.user, entity, "edit");
  const editFields = editAccessor.getFieldsConfig();

  const identifierField =
    entity.config?.identifierField
    ?? req.adminizer.config.identifierField
    ?? entity.model.primaryKey
    ?? "id";
  const identifierKey = typeof identifierField === "string"
    ? identifierField
    : String(identifierField);

  const results: BatchUpdateResult[] = [];
  const errors: BatchUpdateResult[] = [];

  for (const update of updates) {
    const recordId = update?.id;
    const fieldName = String(update?.fieldName ?? "").trim();

    if (!recordId || !fieldName) {
      errors.push({
        id: recordId,
        fieldName,
        error: "Field name and id are required",
        status: 400
      });
      continue;
    }

    const listField = listFields?.[fieldName];
    if (!listField) {
      errors.push({ id: recordId, fieldName, error: "Field not found", status: 404 });
      continue;
    }

    const listFieldConfig = listField.config as BaseFieldConfig;
    if (!listFieldConfig?.inlineEditable) {
      errors.push({ id: recordId, fieldName, error: "Field is not editable inline", status: 403 });
      continue;
    }

    if (!editFields?.[fieldName]) {
      errors.push({ id: recordId, fieldName, error: "Field is not editable", status: 403 });
      continue;
    }

    const validation = validateInlineValue(update?.value, listFieldConfig);
    if (validation.error) {
      errors.push({ id: recordId, fieldName, error: validation.error, status: 400 });
      continue;
    }

    try {
      const updated = await entity.model.updateOne(
        { [identifierKey]: recordId },
        { [fieldName]: validation.value },
        editAccessor
      );

      if (!updated) {
        errors.push({ id: recordId, fieldName, error: "Record not found", status: 404 });
        continue;
      }

      const updatedRecord = updated as Record<string, unknown>;
      results.push({
        id: resolveRecordId(updatedRecord[identifierKey], recordId),
        fieldName,
        value: updatedRecord[fieldName]
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Inline update failed";
      Adminizer.log.error(error);
      errors.push({ id: recordId, fieldName, error: message, status: 500 });
    }
  }

  return res.json({
    success: errors.length === 0,
    results,
    errors
  });
}

const resolveRecordId = (value: unknown, fallback: string | number): string | number => {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }
  return fallback;
};

function validateInlineValue(
  value: unknown,
  fieldConfig: BaseFieldConfig
): InlineValidationResult {
  const inlineConfig = fieldConfig.inlineEditConfig ?? {};
  const fieldType = (fieldConfig.type ?? "string").toString().toLowerCase();

  if (value === undefined) {
    return { error: "Value is required" };
  }

  if (value === null) {
    if (fieldConfig.required) {
      return { error: "Value is required" };
    }
    return { value: null };
  }

  if (fieldType === "boolean") {
    if (typeof value !== "boolean") {
      return { error: "Value must be boolean" };
    }
    return { value };
  }

  if (["number", "integer", "float"].includes(fieldType)) {
    const numeric = typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : NaN;

    if (!Number.isFinite(numeric)) {
      return { error: "Value must be a number" };
    }

    if (fieldType === "integer" && !Number.isInteger(numeric)) {
      return { error: "Value must be an integer" };
    }

    if (inlineConfig.min !== undefined && numeric < inlineConfig.min) {
      return { error: `Value must be at least ${inlineConfig.min}` };
    }

    if (inlineConfig.max !== undefined && numeric > inlineConfig.max) {
      return { error: `Value must be at most ${inlineConfig.max}` };
    }

    return { value: numeric };
  }

  if (fieldType === "select") {
    const options = fieldConfig.isIn;
    if (options) {
      const allowed = Array.isArray(options)
        ? options.map((item) => String(item))
        : Object.keys(options);
      if (!allowed.includes(String(value))) {
        return { error: "Invalid option selected" };
      }
    }
    return { value };
  }

  const textValue = typeof value === "string" ? value : String(value);

  if (inlineConfig.maxLength !== undefined && textValue.length > inlineConfig.maxLength) {
    return { error: `Value must be at most ${inlineConfig.maxLength} characters` };
  }

  if (inlineConfig.pattern) {
    const pattern = new RegExp(inlineConfig.pattern);
    if (!pattern.test(textValue)) {
      return { error: "Value does not match required pattern" };
    }
  }

  return { value: textValue };
}
