import {Link, useForm, usePage} from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout.tsx";
import {BreadcrumbItem, SharedData} from "@/types";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Info, LoaderCircle, MoveLeft} from "lucide-react";
import {FormEventHandler} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

type value = string | boolean | Date | Record<string, string>[]

interface Field {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: value;
}

interface groupedTokens {
    header: string,
    fields: Field[]
}

interface AddGroupProps extends SharedData {
    edit: boolean;
    view: boolean;
    btnBack: {
        title: string;
        link: string;
    },
    btnSave: {
        title: string;
    },
    postLink: string,
    head: string,
    userHead: string,
    fields: Field[],
    users: Field[]
    groupedTokens: groupedTokens[]
}

const breadcrumbs: BreadcrumbItem[] = [];

export default function AddGroup() {
    const page = usePage<AddGroupProps>();

    const {fields, groupedTokens, users} = page.props;
    const initialFormData = {
        ...Object.fromEntries(fields.map(field => [field.name, field.value])),
        ...Object.fromEntries(users.map(field => [field.name, field.value])),
        ...Object.fromEntries(groupedTokens.flatMap(group =>
            group.fields.map(field => [field.name, field.value])))
    };
    const {
        data,
        setData,
        clearErrors,
        post,
        processing,
    } = useForm<Required<Record<string, value>>>(initialFormData);
    const getField = (name: string) => {
        return page.props.fields.find(field => field.name === name);
    }

    const handleChangeDate = (fieldName: string, value: value) => {
        clearErrors()
        setData(fieldName, value);
    }

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(page.props.postLink);
    };
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Button className="mb-3 w-fit" asChild>
                    <Link href={page.props.btnBack.link}>
                        <Icon iconNode={MoveLeft}/>
                        {page.props.btnBack.title}
                    </Link>
                </Button>
                <form id="addUserForm" onSubmit={submit}
                      className={`${page.props.view ? 'cursor-not-allowed' : ''}`}>
                    <div className="flex flex-col gap-6 max-w-[1144px]">
                        <h2 className="font-bold text-xl">{page.props.head}</h2>
                        <div className="grid gap-4">
                            <Label htmlFor={getField('name')?.name}>{getField('name')?.label}</Label>
                            <Input
                                id={getField('name')?.name}
                                type="text"
                                required
                                tabIndex={1}
                                autoComplete={getField('name')?.name}
                                value={data.name as string}
                                onChange={(e) => handleChangeDate('name', e.target.value)}
                                disabled={processing || page.props.view}
                                placeholder={getField('name')?.label}
                            />
                        </div>
                        <div className="grid gap-4">
                            <Label htmlFor={getField('description')?.name}>{getField('description')?.label}</Label>
                            <Input
                                id={getField('description')?.name}
                                type="text"
                                required
                                tabIndex={1}
                                autoComplete={getField('description')?.name}
                                value={data.description as string}
                                onChange={(e) => handleChangeDate('description', e.target.value)}
                                disabled={processing || page.props.view}
                                placeholder={getField('description')?.label}
                            />
                        </div>
                        {page.props.users.length > 0 && (
                            <>
                                <h2 className="font-bold text-xl">{page.props.userHead}</h2>
                                {page.props.users.map((field) => (
                                    <div className="flex gap-3" key={field.name}>
                                        <div className="flex gap-4 items-center">
                                            <Checkbox
                                                id={field.name}
                                                className="cursor-pointer size-5"
                                                disabled={processing || page.props.view}
                                                checked={data[field.name] as boolean}
                                                onCheckedChange={(value) => handleChangeDate(field.name, value)}
                                            />
                                            <Label className="cursor-pointer"
                                                   htmlFor={field.name}>{field.label}</Label>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {page.props.groupedTokens?.length > 0 && (
                                page.props.groupedTokens.map((group) => (
                                    <div key={group.header} className="grid gap-4 content-start justify-between">
                                        <h2 className="font-bold text-xl mt-3">{group.header}</h2>
                                        {group.fields.map((field) => (
                                            <div key={field.name} className="flex gap-3 items-center">
                                                <Checkbox
                                                    id={field.name}
                                                    className="cursor-pointer size-5"
                                                    disabled={processing || page.props.view}
                                                    checked={data[field.name] as boolean}
                                                    onCheckedChange={(value) => handleChangeDate(field.name, value)}
                                                />
                                                <div className="flex gap-3">
                                                    <Label className="cursor-pointer"
                                                           htmlFor={field.name}>{field.label}</Label>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger onClick={(e) => e.preventDefault()}>
                                                                <Icon iconNode={Info}
                                                                      className="text-primary w-5 h-5 cursor-pointer"/>
                                                            </TooltipTrigger>
                                                            <TooltipContent align="center" side="top">
                                                                <p>{field.tooltip}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                        <Button variant="green" type="submit" className="mt-4 w-fit cursor-pointer"
                                disabled={processing || page.props.view}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin"/>}
                            {page.props.btnSave.title}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
