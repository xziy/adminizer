import {useForm, usePage} from "@inertiajs/react";
import {SharedData} from "@/types";
import {FormEventHandler, useEffect} from "react";
import {toast} from "sonner";
import {Toaster} from "@/components/ui/sonner.tsx";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import InputError from "@/components/input-error.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Button} from "@/components/ui/button.tsx";
import {initializeTheme} from "@/hooks/use-appearance.tsx";

interface InitUserProps extends SharedData {
    header: {
        title: string
        desc: string
    }
    submitLink: string
    loginLabel: string
    passwordLabel: string
    confirmPasswordLabel: string
    confirmError: string
    localeLabel: string
    submitButton: string
    locales: string[]
    defaultLocale: string
}

export default function InitUser() {
    const page = usePage<InitUserProps>()
    const {post, data, setData, processing, setError, errors, clearErrors} = useForm({
        locale: page.props.defaultLocale,
        confirmPassword: '',
        password: '',
        login: '',
    })
    useEffect(() => {
        initializeTheme()
    }, []);

    const submit: FormEventHandler = (e) => {
        e.preventDefault()
        if (data.password !== data.confirmPassword) {
            setError('confirmPassword', page.props.confirmError)
            return
        }

        post(page.props.submitLink, {
            onSuccess: () => {
            },
            onError: (errors) => {
                for (const key of Object.keys(errors)) {
                    toast.error(errors[key])
                }
            }
        })
    }
    const handleChangeDate = (fieldName: keyof typeof data, value: string) => {
        clearErrors()
        setData(fieldName, value);
    }
    return (
        <div className="bg-sidebar flex min-h-svh w-full justify-center items-center">
            <Toaster position="top-center" richColors closeButton/>
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6 max-w-sm w-full h-fit">
                <h1 className="font-medium mb-2 text-xl">{page.props.header.title}</h1>
                <p className="text-muted-foreground text-sm">{page.props.header.desc}</p>
                <form onSubmit={submit} className="mt-6">
                    <div className="grid gap-5">
                        <div className="grid gap-4">
                            <Label htmlFor="login">{page.props.loginLabel}<span
                                className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Input
                                    id="login"
                                    className={`${errors.login ? 'border-red-500' : ''}`}
                                    type="text"
                                    required
                                    tabIndex={1}
                                    autoComplete="username"
                                    value={data.login}
                                    disabled={processing}
                                    onChange={(e) => {
                                        handleChangeDate('login', e.target.value)
                                    }}
                                    placeholder={page.props.loginLabel}
                                />
                                <InputError message={errors.login}/>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            <Label htmlFor="password">{page.props.passwordLabel}<span
                                className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    className={`${errors.password ? 'border-red-500' : ''}`}
                                    type="password"
                                    required
                                    tabIndex={1}
                                    autoComplete="new-password"
                                    value={data.password}
                                    disabled={processing}
                                    onChange={(e) => {
                                        handleChangeDate('password', e.target.value)
                                    }}
                                    placeholder={page.props.passwordLabel}
                                />
                                <InputError message={errors.password}/>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            <Label htmlFor="confirmPassword">{page.props.confirmPasswordLabel}<span
                                className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    className={`${errors.confirmPassword ? 'border-red-500' : ''}`}
                                    type="password"
                                    required
                                    tabIndex={1}
                                    autoComplete="new-password"
                                    value={data.confirmPassword}
                                    disabled={processing}
                                    onChange={(e) => {
                                        handleChangeDate('confirmPassword', e.target.value)
                                    }}
                                    placeholder={page.props.confirmPasswordLabel}
                                />
                                <InputError message={errors.confirmPassword}/>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            <Label htmlFor="locale">{page.props.localeLabel}</Label>
                            <Select onValueChange={(value) => handleChangeDate('locale', value)}
                                    defaultValue={page.props.defaultLocale} disabled={processing}>
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder={page.props.localeLabel}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {page.props.locales.map((locale) => (
                                        <SelectItem key={locale} value={locale}>{locale.toLocaleUpperCase()}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-4">
                            <Button type="submit" className="w-fit"
                                    disabled={processing}>{page.props.submitButton}</Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
