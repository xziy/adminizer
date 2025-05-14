import {type FC, useCallback, FormEventHandler, memo, useEffect, useState} from 'react';
import {Link, useForm} from "@inertiajs/react";
import {Info, LoaderCircle, MoveLeft} from "lucide-react";
import {Field} from '@/types';
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {type Content} from "vanilla-jsoneditor";
import FieldRenderer from "@/components/field-renderer.tsx";
import {useInView} from 'react-intersection-observer';
import {Skeleton} from "@/components/ui/skeleton.tsx";
import {getFieldError, hasFormErrors, resetFormErrors} from '@/hooks/form-state';
import InputError from "@/components/input-error.tsx";
import {AddProps} from '@/pages/add';
import axios from "axios";

export type FieldValue = string | boolean | number | Date | any[] | Content;


const LabelRenderer: FC<{ field: Field }> = memo(({field}) => {
    return (
        <div className="flex gap-3">
            <Label htmlFor={`${field.type}-${field.name}`}>{field.label}</Label>
            {field.tooltip && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger onClick={(e) => e.preventDefault()}>
                            <Icon
                                iconNode={Info}
                                className="text-primary w-5 h-5 cursor-pointer"
                            />
                        </TooltipTrigger>
                        <TooltipContent align="center" side="top" className="z-[1002]">
                            <p>{field.tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    )
})

const LazyField: FC<{
    field: Field;
    value: FieldValue;
    onChange: (name: string, value: FieldValue) => void;
    processing: boolean;
    notFound?: string
    search?: string
}> = memo(({field, value, onChange, processing, notFound, search}) => {
    const [ref, inView] = useInView({
        triggerOnce: true,
        rootMargin: '100px 0px', // Начинаем загружать заранее
    });

    return (
        <div ref={ref} className="grid gap-4 w-full">
            {inView ? (
                <FieldRenderer
                    field={field}
                    value={value}
                    onChange={onChange}
                    notFound={notFound}
                    search={search}
                    processing={processing}
                />
            ) : <Skeleton className="w-full h-[250px] rounded-sm"/>}
        </div>
    );
});


const AddForm: FC<{ page: { props: AddProps }, catalog: boolean, callback?: () => void }> =
    ({page, catalog, callback}) => {

        const {fields, btnBack, view, notFound} = page.props;
        const {
            data,
            setData,
            post,
            processing,
        } = useForm<Record<string, any>>({
            ...Object.fromEntries(fields.map(field => [field.name, field.value ?? undefined])),
            jsonPopupCatalog: catalog
        });
        const [catalogProcessing, setCatalogProcessing] = useState(false)

        useEffect(() => {
            // Reset errors
            resetFormErrors();
            return () => {
                resetFormErrors();
            };
        }, []);

        const handleFieldChange = useCallback(
            (fieldName: string, value: FieldValue) => {
                setData(fieldName, value);
            }, []);

        const submit: FormEventHandler = async (e) => {
            e.preventDefault();
            if (catalog) {
                setCatalogProcessing(true)
                const res = await axios.post(page.props.postLink, data)
                if (res.status === 200) {
                    if (callback) {
                        callback()
                    }
                }
            } else {
                post(page.props.postLink);
            }
        };

        return (
            <div className="p-4 w-full">
                {!catalog &&
                    <div className="w-full sticky z-[1001] py-4 pb-8 top-0 h-fit bg-background flex gap-4">
                        <Button className="w-fit" asChild>
                            <Link href={btnBack.link} preserveScroll={true}>
                                <Icon iconNode={MoveLeft}/>
                                {btnBack.title}
                            </Link>
                        </Button>
                        <Button variant="green" type="submit" className="w-fit cursor-pointer lg:hidden"
                                form="addUserForm"
                                disabled={catalogProcessing || processing || page.props.view || hasFormErrors()}>
                            {catalogProcessing || processing && <LoaderCircle className="h-4 w-4 animate-spin"/>}
                            {page.props.btnSave.title}
                        </Button>
                    </div>
                }
                <form
                    id="addUserForm"
                    onSubmit={submit}
                    className={view ? 'cursor-not-allowed' : ''}
                >
                    <div className="grid lg:grid-cols-[1fr_150px] gap-4 max-w-[1144px] pb-8">
                        <div className="flex flex-col gap-10">
                            {fields.map((field) => (
                                <div className={`grid gap-4 w-full ${view ? 'pointer-events-none' : ''}`}
                                     key={field.name}>
                                    {field.type === "markdown" || field.type === "table" || field.type === "jsonEditor" || field.type === "codeEditor" || field.type === "geoJson" ?
                                        <>
                                            <LabelRenderer field={field}/>
                                            <InputError message={getFieldError(`${field.type}-${field.name}`)}/>
                                            <LazyField
                                                field={field}
                                                value={data[field.name]}
                                                onChange={handleFieldChange}
                                                processing={catalogProcessing || processing || view}
                                                notFound={notFound}
                                                search={page.props.search}
                                            />
                                        </>
                                        :
                                        <>
                                            <LabelRenderer field={field}/>
                                            <InputError message={getFieldError(`${field.type}-${field.name}`)}/>
                                            <FieldRenderer
                                                field={field}
                                                value={data[field.name]}
                                                onChange={handleFieldChange}
                                                processing={catalogProcessing || processing || view}
                                                notFound={notFound}
                                                search={page.props.search}
                                            />
                                        </>
                                    }
                                </div>
                            ))}
                        </div>
                        <div className={`p-4 rounded-md h-fit sticky shadow hidden lg:block ${catalog ? 'top-0' : 'top-[84px] '}`}>
                            <Button variant="green" type="submit" className="w-fit cursor-pointer"
                                    disabled={catalogProcessing || processing || page.props.view || hasFormErrors()}>
                                {(catalogProcessing || processing) && <LoaderCircle className="h-4 w-4 animate-spin"/>}
                                {page.props.btnSave.title}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        );
    };

export {
    LazyField,
    LabelRenderer,
}

export default AddForm;
