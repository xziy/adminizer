# Form Error Management

## Overview
A lightweight reactive error management system for forms using JavaScript Proxy.

## API Reference

### Methods

#### `setFieldError(fieldName: string, hasError: boolean, message?: string)`
Sets or clears field-level errors.

**Parameters:**


- `fieldName`&nbsp;&nbsp;**string**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Field identifier
- `hasError`&nbsp;&nbsp;&nbsp;&nbsp;**boolean**&nbsp;&nbsp;Whether error exists
- `message?`&nbsp;&nbsp;&nbsp;&nbsp;**string**&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Optional error message

#### `getFieldError(fieldName: string): string | undefined`
Retrieves error message for a field.

**Returns:** Error message string or undefined

#### `hasFormErrors(): boolean`
Checks if form contains any errors.

**Returns:** `true` if any field has errors

#### `resetFormErrors()`
Clears all form errors.

### Type Definitions

```typescript
interface ErrorState {
  hasError: boolean;
  message?: string;
}

interface FormState {
  errors: Record<string, ErrorState>;
}
```
## Example
``` typescript
// Set error
setFieldError('email', true, 'Invalid email format');

// Check errors
if (hasFormErrors()) {
console.log('Form has validation errors');
}

// Get specific error
console.log(getFieldError('email')); // 'Invalid email format'

// Clear errors
resetFormErrors();
```
In custom controls, add errors like this:
```typescript
setFieldError(props.name, true, 'message');
```
The custom control is called dynamically and receives the following props:
```jsx
   <DynamicControls moduleComponent={field.options?.path as string} options={field.options?.config}
    initialValue={value} name={`${field.type}-${field.name}`}
    onChange={handleEditorChange}/>
```
Therefore, you should use `props.name` when adding errors<br/>
Error output is implemented in the form like this:
```jsx
//...
 <>
    <LabelRenderer field={field}/>
    <InputError message={getFieldError(`${field.type}-${field.name}`)}/>
    <LazyField
    field={field}
    value={data[field.name]}
    onChange={handleFieldChange}
    processing={processing || view}
    />
</>
//...
```
### implementation
**See the implementation here** `src/assets/js/components/VanillaJSONEditor.tsx`<br/>

