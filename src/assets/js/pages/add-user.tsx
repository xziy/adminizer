import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem, SharedData} from '@/types';
import {Link, useForm, usePage} from "@inertiajs/react";
import {Icon} from "@/components/icon.tsx";
import {MoveLeft} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import InputError from '@/components/input-error';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {useEffect, useState} from "react";
import ky from 'ky';
import {DatePicker} from "@/components/date-picker.tsx";
import {Checkbox} from "@/components/ui/checkbox"

interface Field {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: string | boolean | Date | Record<string, string>[];
}

interface AddUserProps extends SharedData {
    back: {
        title: string;
        link: string;
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
        //post,
        processing,
        errors,
        //reset
    } = useForm<Required<Record<string, string | boolean | Date | Record<string, string>[]>>>(initialFormData);

    useEffect(() => {
        const getTimezones = async () => {
            const data = await ky.get(`${window.routePrefix}/get-timezones`).json() as {
                timezones: Record<string, string>[]
            }
            setTimezones(data.timezones)
        }
        getTimezones()
    }, [])

    const getField = (name: string) => {
        return page.props.fields.find(field => field.name === name);
    }


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Button className="mb-3 w-fit" asChild>
                    <Link href={page.props.back.link}>
                        <Icon iconNode={MoveLeft}/>
                        {page.props.back.title}
                    </Link>
                </Button>
                <form id="addUserForm" action={page.props.postLink} method="POST">
                    <div className="flex flex-col gap-10 max-w-[1144px]">
                        <h2 className="font-bold text-xl">{page.props.head}</h2>
                        <div className="flex gap-16">
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
                                        onChange={(e) => setData('login', e.target.value)}
                                        disabled={processing}
                                        placeholder={getField('login')?.label}
                                    />
                                    <InputError message={errors.name} className="mt-2"/>
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
                                        onChange={(e) => setData('fullName', e.target.value)}
                                        disabled={processing}
                                        placeholder={getField('fullName')?.label}
                                    />
                                    <InputError message={errors.name} className="mt-2"/>
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
                                        onChange={(e) => setData('email', e.target.value)}
                                        disabled={processing}
                                        placeholder={getField('email')?.label}
                                    />
                                    <InputError message={errors.name} className="mt-2"/>
                                </div>
                            </div>
                            <div className="basis-1/2 flex flex-col gap-6">
                                <div className="grid gap-4">
                                    <Label htmlFor={getField('timezone')?.name}>{getField('timezone')?.label}</Label>
                                    <Select onValueChange={(value) => setData('timezone', value)}>
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
                                <div className="flex justify-between items-center">
                                    {getField('date') && (
                                        <div className="grid gap-4">
                                            <Label htmlFor={getField('date')?.name}>{getField('date')?.label}</Label>
                                            <DatePicker onSelect={(data) => setData('date', data as Date)}
                                                        selected={data.date as Date}/>
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
                                                    onCheckedChange={(value) => setData('isAdmin', value)}
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
                                                    onCheckedChange={(value) => setData('isConfirmed', value)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {getField('locale') && (
                                    <div className="grid gap-4">
                                        <Label htmlFor={getField('locale')?.name}>{getField('locale')?.label}</Label>
                                        <Select onValueChange={(value) => setData('locale', value)}>
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
                    </div>
                </form>
                <pre>
                {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </AppLayout>
    );
}
