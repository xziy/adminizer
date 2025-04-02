import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem, SharedData} from '@/types';
import {Link, useForm, usePage} from "@inertiajs/react";
import {Icon} from "@/components/icon.tsx";
import {LoaderCircle, MoveLeft, Info} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {FormEventHandler, useEffect, useState} from "react";
import ky from 'ky';
import {DatePicker} from "@/components/date-picker.tsx";
import {Checkbox} from "@/components/ui/checkbox"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import InputError from "@/components/input-error.tsx";


interface Field {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: string | boolean | Date | Record<string, string>[];
}

interface AddUserProps extends SharedData {
    edit: boolean;
    view: boolean;
    btnBack: {
        title: string;
        link: string;
    },
    passwordError: string
    btnSave: {
        title: string;
    },
    postLink: string,
    head: string,
    groupHead: string,
    fields: Field[]
    groups: Field[]
    locales: Record<string, string>[]
}

const breadcrumbs: BreadcrumbItem[] = [];
export default function AddUser() {
    const page = usePage<AddUserProps>()
    const [timezones, setTimezones] = useState<Record<string, string>[]>()

    const {fields, groups} = page.props;
    const initialFormData = {
        ...Object.fromEntries(fields.map(field => [field.name, field.value])),
        ...Object.fromEntries(groups.map(group => [group.name, group.value]))
    };

    const {
        data,
        setData,
        errors,
        setError,
        clearErrors,
        post,
        processing,
    } = useForm<Required<Record<string, string | boolean | Date | Record<string, string>[]>>>(initialFormData);

    useEffect(() => {
        const getTimezones = async () => {
            const data = await ky.get(`${window.routePrefix}/get-timezones`).json() as {
                timezones: Record<string, string>[]
            }
            setTimezones(data.timezones)
        }
        getTimezones()
        console.log(page.props)
    }, [])

    const getField = (name: string) => {
        return page.props.fields.find(field => field.name === name);
    }

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (data.userPassword !== data.repeatUserPassword) {
            setError('repeatUserPassword', page.props.passwordError)
            return
        }
        post(page.props.postLink);
    };

    const handleChangeDate = (fieldName: string, value: string | Date | boolean) => {
        clearErrors()
        setData(fieldName, value);
    }

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
                      className={`${page.props.view ? 'pointer-events-none opacity-60' : ''}`}>
                    <div className="flex flex-col gap-10 max-w-[1144px]">
                        <h2 className="font-bold text-xl">{page.props.head}</h2>
                        <div className="flex-col xl:flex-row flex gap-16">
                            <div className="basis-1/2 flex flex-col gap-6">
                                <div className="grid gap-4">
                                    <Label htmlFor={getField('login')?.name}>{getField('login')?.label}</Label>
                                    <Input
                                        id={getField('login')?.name}
                                        type="text"
                                        required
                                        tabIndex={1}
                                        autoComplete={getField('login')?.name}
                                        value={data.login as string}
                                        onChange={(e) => handleChangeDate('login', e.target.value)}
                                        disabled={processing}
                                        placeholder={getField('login')?.label}
                                    />
                                </div>
                                <div className="grid gap-4">
                                    <Label htmlFor={getField('fullName')?.name}>{getField('fullName')?.label}</Label>
                                    <Input
                                        id={getField('fullName')?.name}
                                        type="text"
                                        required
                                        tabIndex={1}
                                        autoComplete={getField('fullName')?.name}
                                        value={data.fullName as string}
                                        onChange={(e) => handleChangeDate('fullName', e.target.value)}
                                        disabled={processing}
                                        placeholder={getField('fullName')?.label}
                                    />
                                </div>
                                <div className="grid gap-4">
                                    <Label htmlFor={getField('email')?.name}>{getField('email')?.label}</Label>
                                    <Input
                                        id={getField('email')?.name}
                                        type="email"
                                        required
                                        tabIndex={1}
                                        autoComplete={getField('email')?.name}
                                        value={data.email as string}
                                        onChange={(e) => handleChangeDate('field', e.target.value)}
                                        disabled={processing}
                                        placeholder={getField('email')?.label}
                                    />
                                </div>
                            </div>
                            <div className="basis-1/2 flex flex-col gap-6">
                                <div className="grid gap-4">
                                    <Label htmlFor={getField('timezone')?.name}>{getField('timezone')?.label}</Label>
                                    <Select onValueChange={(value) => handleChangeDate('timezone', value)}
                                            defaultValue={data.timezone as string}>
                                        <SelectTrigger className="w-full cursor-pointer">
                                            <SelectValue placeholder={getField('timezone')?.name}/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(timezones ?? []).map((option) => (
                                                <SelectItem value={option.value}
                                                            key={option.value}>{option.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col md:flex-row justify-start gap-4 xl:justify-between items-start md:items-center">
                                    {getField('date') && (
                                        <div className="grid gap-4">
                                            <Label htmlFor={getField('date')?.name}>{getField('date')?.label}</Label>
                                            <DatePicker onSelect={(data) => handleChangeDate('date', data as Date)}
                                                        selected={data.date ? new Date(data.date as string) : undefined}/>
                                        </div>
                                    )}
                                    <div className="flex gap-6">
                                        {getField('isAdmin') && (
                                            <div className="grid gap-4">
                                                <Label className="cursor-pointer"
                                                       htmlFor={getField('isAdmin')?.name}>{getField('isAdmin')?.label}</Label>
                                                <Checkbox
                                                    id={getField('isAdmin')?.name}
                                                    className="cursor-pointer size-5"
                                                    checked={data.isAdmin as boolean}
                                                    onCheckedChange={(value) => handleChangeDate('isAdmin', value)}
                                                />
                                            </div>
                                        )}
                                        {getField('isConfirmed') && (
                                            <div className="grid gap-4">
                                                <Label className="cursor-pointer"
                                                       htmlFor={getField('isConfirmed')?.name}>{getField('isConfirmed')?.label}</Label>
                                                <Checkbox
                                                    id={getField('isConfirmed')?.name}
                                                    className="cursor-pointer size-5"
                                                    checked={data.isConfirmed as boolean}
                                                    onCheckedChange={(value) => handleChangeDate('isConfirmed', value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {getField('locale') && (
                                    <div className="grid gap-4">
                                        <Label htmlFor={getField('locale')?.name}>{getField('locale')?.label}</Label>
                                        <Select onValueChange={(value) => handleChangeDate('locale', value)}
                                                defaultValue={data.locale as string}>
                                            <SelectTrigger className="w-full cursor-pointer">
                                                <SelectValue placeholder={getField('locale')?.name}/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(page.props.locales ?? []).map((option) => (
                                                    <SelectItem value={option.value}
                                                                key={option.value}>{option.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <label className="font-bold text-xl">{getField('userPassword')?.label}</label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger onClick={(e) => e.preventDefault()}>
                                        <Icon iconNode={Info} className="text-primary w-5 h-5 cursor-pointer"/>
                                    </TooltipTrigger>
                                    <TooltipContent align="center" side="top">
                                        <p>{getField('userPassword')?.tooltip}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="grid grid-col-1 lg:grid-cols-2 grid-rows-2 gap-x-16 gap-y-6">
                            <div className="grid gap-4 col-span-1">
                                <Label
                                    htmlFor={getField('userPassword')?.name}>{getField('userPassword')?.label}</Label>
                                <Input
                                    id={getField('userPassword')?.name}
                                    type="password"
                                    required={!page.props.edit}
                                    tabIndex={1}
                                    autoComplete={getField('userPassword')?.name}
                                    value={data.password as string}
                                    onChange={(e) => handleChangeDate('userPassword', e.target.value)}
                                    disabled={processing}
                                    placeholder={getField('userPassword')?.label}
                                />
                            </div>
                            <div className="grid gap-4 col-span-1 col-start-1">
                                <Label
                                    htmlFor={getField('repeatUserPassword')?.name}>{getField('repeatUserPassword')?.label}</Label>
                                <Input
                                    id={getField('repeatUserPassword')?.name}
                                    type="password"
                                    required={!page.props.edit}
                                    tabIndex={1}
                                    autoComplete={getField('repeatUserPassword')?.name}
                                    value={data.repeatUserPassword as string}
                                    onChange={(e) => handleChangeDate('repeatUserPassword', e.target.value)}
                                    disabled={processing}
                                    placeholder={getField('repeatUserPassword')?.label}
                                />
                                <InputError message={errors.repeatUserPassword}/>
                            </div>
                        </div>
                        {page.props.groups.length > 0 && (
                            <>
                                <h2 className="font-bold text-xl">{page.props.groupHead}</h2>
                                <div className="flex flex-col">
                                    {page.props.groups.map(group => (
                                        <div className="grid gap-4" key={group.name}>
                                            <Label className="cursor-pointer"
                                                   htmlFor={group.name}>{group.label}</Label>
                                            <Checkbox
                                                id={group.name}
                                                className="cursor-pointer size-5"
                                                checked={data[group.name] as boolean}
                                                onCheckedChange={(value) => handleChangeDate(group.name, value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        <Button variant="green" type="submit" className="mt-4 w-fit cursor-pointer"
                                disabled={processing}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin"/>}
                            {page.props.btnSave.title}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
