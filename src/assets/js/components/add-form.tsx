import {type FC, useMemo, useCallback, ReactNode, FormEventHandler, memo, lazy, Suspense} from 'react';
import {Link, useForm, usePage} from "@inertiajs/react";
import {Info, LoaderCircle, MoveLeft} from "lucide-react";
import {type SharedData} from '@/types';
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import {Slider} from "@/components/ui/slider.tsx";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import AdminCKEditor from "@/components/ckeditor/ckeditor.tsx";
import DynamicControls from "@/components/dynamic-controls.tsx";
import {RowObject} from "handsontable/common";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import VanillaJSONEditor from "@/components/VanillaJSONEditor.tsx";
import {type Content} from "vanilla-jsoneditor";


type FieldValue = string | boolean | number | Date | any[] | Content;

interface Field {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: FieldValue;
    disabled?: boolean;
    required?: boolean;
    isIn?: string[];
    options?: any;
}

interface AddProps extends SharedData {
    actions: {
        link: string;
        id: string;
        title: string;
        icon: string;
    }[];
    btnBack: {
        title: string;
        link: string;
    };
    fields: Field[];
    edit: boolean;
    view: boolean;
    btnSave: {
        title: string;
    },
    postLink: string,
}

const TuiLazy = lazy(() => import('@/components/toast-editor.tsx'));
const HandsonTableLazy = lazy(() => import('@/components/handsontable.tsx'));
const FieldRenderer: FC<{
    field: Field;
    value: FieldValue;
    onChange: (name: string, value: FieldValue) => void;
    // setTable: (table: any) => void;
    processing: boolean;
}> = memo(({field, value, onChange, processing}) => {

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            onChange(field.name, e.target.value);
        },
        [onChange, field.name]
    );

    const handleSliderChange = useCallback(
        (values: number[]) => {
            onChange(field.name, values[0]);
        },
        [onChange, field.name]
    );

    const handleCheckboxChange = useCallback(
        (checked: boolean) => {
            onChange(field.name, checked);
        },
        [onChange, field.name]
    );

    const handleSelectChange = useCallback(
        (selectedValue: string) => {
            onChange(field.name, selectedValue);
        },
        [onChange, field.name]
    );

    const handleEditorChange = useCallback(
        (value: string) => {
            onChange(field.name, value);
        },
        [onChange, field.name]
    )

    const handleDateChange = useCallback((value: RowObject[]) => {
        onChange(field.name, value);
    }, [onChange, field.name])

    const handleJSONChange = useCallback((value: Content) => {
        onChange(field.name, value);
    }, [onChange, field.name])

    const inputClassName = useMemo(() => {
        if (field.type === 'color') {
            return 'max-w-[40px] p-px h-[40px] border-transparent';
        }
        if (['date', 'datetime-local', 'time', 'month', 'week'].includes(field.type)) {
            return 'w-fit';
        }
        return ''
    }, []);

    switch (field.type) {
        case 'checkbox':
            return (
                <Checkbox
                    id={field.name}
                    disabled={processing || field.disabled}
                    tabIndex={1}
                    className="cursor-pointer size-5"
                    checked={value as boolean ?? false}
                    onCheckedChange={handleCheckboxChange}
                />
            );
        case 'textarea':
            return (
                <Textarea
                    id={field.name}
                    tabIndex={1}
                    disabled={processing || field.disabled}
                    value={value as string ?? ''}
                    onChange={handleInputChange}
                    placeholder={field.label}
                />
            );
        case 'range':
            return (
                <>
                    <output>{value as ReactNode}</output>
                    <Slider
                        defaultValue={[Number(field.value) || 0]}
                        value={[Number(value) || 0]}
                        max={field.options?.max ? Number(field.options.max) : 100}
                        min={field.options?.min ? Number(field.options.min) : 0}
                        step={1}
                        id={field.name}
                        onValueChange={handleSliderChange}
                        disabled={processing || field.disabled}
                    />
                </>
            );
        case 'select':
            return (
                <Select
                    onValueChange={handleSelectChange}
                    defaultValue={value as string ?? ''}
                    disabled={processing || field.disabled}
                >
                    <SelectTrigger className="w-full cursor-pointer" id={field.name}>
                        <SelectValue placeholder={field.name}/>
                    </SelectTrigger>
                    <SelectContent>
                        {(field.isIn ?? []).map((option) => (
                            <SelectItem value={option} key={option}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        case 'wysiwyg':
            if (field.options?.name === 'ckeditor') {
                return (
                    <AdminCKEditor
                        initialValue={value as string ?? ''}
                        onChange={handleEditorChange}
                        options={field.options?.config as { items: string[] }}
                    />
                )
            } else {
                return (
                    <DynamicControls moduleComponent={field.options?.path as string} options={field.options?.config}
                                     initialValue={value as string ?? ''}
                                     onChange={handleEditorChange}/>
                )
            }
        case 'markdown':
            return (
                <Suspense fallback={<Skeleton className="w-full h-[352px]"/>}>
                    <TuiLazy initialValue={field.value as string ?? ''} options={field.options?.config}
                             onChange={handleEditorChange}/>
                </Suspense>
            )
        case 'table':
            return (
                <Suspense fallback={<Skeleton className="w-full h-[150px]"/>}>
                    <HandsonTableLazy data={value as any[]} config={field.options?.config} onChange={handleDateChange}/>
                </Suspense>
            )
        case 'json':
            return (
                <VanillaJSONEditor
                    content={value as Content}
                    onChange={handleJSONChange}
                />
            )
        default:
            return (
                <Input
                    id={field.name}
                    type={field.type}
                    className={inputClassName}
                    required={field.required}
                    tabIndex={1}
                    value={value as any ?? ''}
                    onChange={handleInputChange}
                    disabled={processing || field.disabled}
                    placeholder={field.label}
                />
            );
    }
});

const LabelRenderer: FC<{ field: Field }> = memo(({field}) => {
    return (
        <div className="flex gap-3">
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.tooltip && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger onClick={(e) => e.preventDefault()}>
                            <Icon
                                iconNode={Info}
                                className="text-primary w-5 h-5 cursor-pointer"
                            />
                        </TooltipTrigger>
                        <TooltipContent align="center" side="top">
                            <p>{field.tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    )
})

const AddForm: FC = () => {
    const page = usePage<AddProps>();
    const {fields, btnBack, view} = page.props;


    const {
        data,
        setData,
        // errors,
        clearErrors,
        post,
        processing,
    } = useForm<Record<string, any>>(Object.fromEntries(fields.map(field => [field.name, field.value ?? undefined])));

    const handleFieldChange = useCallback(
        (fieldName: string, value: FieldValue) => {
            clearErrors();
            setData(fieldName, value);
        },
        []
    );


    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(page.props.postLink);
    };


    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <Button className="mb-3 w-fit" asChild>
                <Link href={btnBack.link}>
                    <Icon iconNode={MoveLeft}/>
                    {btnBack.title}
                </Link>
            </Button>
            <form
                id="addUserForm"
                onSubmit={submit}
                className={view ? 'cursor-not-allowed' : ''}
            >
                <div className="flex flex-col gap-10 max-w-[1144px]">
                    {fields.map((field) => (
                        <div className="grid gap-4" key={field.name}>
                            <LabelRenderer field={field}/>
                            <FieldRenderer
                                field={field}
                                value={data[field.name]}
                                onChange={handleFieldChange}
                                processing={processing || page.props.view}
                            />
                        </div>
                    ))}
                    <Button variant="green" type="submit" className="mt-4 w-fit cursor-pointer"
                            disabled={processing || page.props.view}>
                        {processing && <LoaderCircle className="h-4 w-4 animate-spin"/>}
                        {page.props.btnSave.title}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AddForm;
