import {type FC, useCallback, FormEventHandler, memo } from 'react';
import {Link, useForm, usePage} from "@inertiajs/react";
import {Info, LoaderCircle, MoveLeft} from "lucide-react";
import {Field, type SharedData} from '@/types';
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {type Content} from "vanilla-jsoneditor";
import FieldRenderer from "@/components/filed-renderer.tsx";

type FieldValue = string | boolean | number | Date | any[] | Content;


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
