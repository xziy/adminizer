import {Link, useForm, usePage} from "@inertiajs/react";
import {SharedData} from "@/types";
import {FormEventHandler} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import InputError from "@/components/input-error.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Button} from "@/components/ui/button.tsx";
import {toast} from "sonner";
import {Toaster} from "@/components/ui/sonner.tsx";

interface RegisterProps extends SharedData {
    header: {
        title: string
        desc: string
    }
    submitLink: string
    loginLabel: string
    fullNameLabel: string
    passwordLabel: string
    confirmPasswordLabel: string
    confirmError: string
    emailLabel: string
    localeLabel: string
    submitButton: string
    backToLogin: {
        link: string
        text: string
    }
}

export default function Register() {
    const page = usePage<RegisterProps>();
    const {post, data, setData, processing, setError, errors, clearErrors} = useForm({
        locale: 'en',
        email: '',
        confirmPassword: '',
        password: '',
        fullName: '',
        login: '',
    })

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
                                    autoComplete="login"
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
                            <Label htmlFor="fullName">{page.props.fullNameLabel}<span
                                className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Input
                                    id="fullName"
                                    className={`${errors.fullName ? 'border-red-500' : ''}`}
                                    type="text"
                                    required
                                    tabIndex={1}
                                    autoComplete="fullName"
                                    value={data.fullName}
                                    disabled={processing}
                                    onChange={(e) => {
                                        handleChangeDate('fullName', e.target.value)
                                    }}
                                    placeholder={page.props.fullNameLabel}
                                />
                                <InputError message={errors.fullName}/>
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
                                    autoComplete="password"
                                    value={data.password}
                                    disabled={processing}
                                    onChange={(e) => {
                                        handleChangeDate('password', e.target.value)
                                    }}
                                    placeholder={page.props.fullNameLabel}
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
                                    autoComplete="confirmPassword"
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
                            <Label htmlFor="email">{page.props.emailLabel}<span
                                className="text-red-500">*</span></Label>
                            <div className="relative">
                                <Input
                                    id="email"
                                    className={`${errors.email ? 'border-red-500' : ''}`}
                                    type="email"
                                    required
                                    tabIndex={1}
                                    autoComplete="email"
                                    value={data.email}
                                    disabled={processing}
                                    onChange={(e) => {
                                        handleChangeDate('email', e.target.value)
                                    }}
                                    placeholder={page.props.emailLabel}
                                />
                                <InputError message={errors.email}/>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            <Label htmlFor="locale">{page.props.localeLabel}</Label>
                            <Select onValueChange={(value) => handleChangeDate('locale', value)}
                                    defaultValue="en" disabled={processing}>
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder={page.props.localeLabel}/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">EN</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-4">
                            <Button type="submit" className="w-fit"
                                    disabled={processing}>{page.props.submitButton}</Button>
                            <Button asChild variant="outline">
                                <Link href={page.props.backToLogin.link}
                                      className={`${processing} ? 'pointer-events-none opacity-50' : ''`}>{page.props.backToLogin.text}</Link>
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
