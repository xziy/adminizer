import {Link, useForm, usePage} from "@inertiajs/react";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Icon} from "@/components/icon.tsx";
import {Loader2, User} from "lucide-react";
import {SharedData} from "@/types";
import {Button} from "@/components/ui/button.tsx";
import {FormEventHandler, useEffect, useState} from "react";
import Puzzle from 'crypto-puzzle';
import {Toaster} from "@/components/ui/sonner.tsx";
import {toast} from "sonner";
import InputError from "@/components/input-error.tsx";
import {initializeTheme} from "@/hooks/use-appearance.tsx";

interface LoginProps extends SharedData {
    login: string
    password: string
    title: string
    description: string
    submitButton: string
    submitLink: string
    registerLink?: {
        title: string
        link: string
    },
    captchaTask: number[]
}

export default function Login() {
    const [captchaProcessing, setCaptchaProcessing] = useState(false);

    useEffect(() => {
        initializeTheme()
    }, []);

    const page = usePage<LoginProps>()

    const [captchaMessage, setCaptchaMessage] = useState("I'm not a robot");
    const [showCheckmark, setShowCheckmark] = useState(false);

    const {post, data, setData, processing, transform, errors, clearErrors} = useForm({
        login: '',
        password: '',
        captchaSolution: ''
    })

    const submit: FormEventHandler = (e) => {
        e.preventDefault()
        setCaptchaProcessing(true)
        setCaptchaMessage("Solving CAPTCHA...")
        setShowCheckmark(false)
        const solveCaptchaAndSubmit = async () => {
            try {
                function sleep(ms: number) {
                    return new Promise((resolve) => setTimeout(resolve, ms));
                }

                // spinner does not have time to appear, so call sleep function
                await sleep(100)

                // Start solving
                const puzzle = new Uint8Array(page.props.captchaTask)

                const solution = await Puzzle.solve(puzzle);
                // CAPTCHA solved
                setCaptchaMessage("Verification complete!")

                setCaptchaProcessing(false)
                setShowCheckmark(true)
                transform((data) => ({
                    ...data,
                    captchaSolution: solution
                }))

                post(page.props.submitLink, {
                    onError: (errors) => {
                        for (const key of Object.keys(errors)) {
                            toast.error(errors[key])
                        }
                    }
                })
            } catch (error) {
                console.error("Error solving CAPTCHA:", error);
                setCaptchaMessage("Error solving CAPTCHA. Try again.")
            }
        }
        solveCaptchaAndSubmit()

    }

    const handleChangeDate = (fieldName: keyof typeof data, value: string) => {
        clearErrors()
        setData(fieldName, value);
    }

    return (
        <div className="bg-sidebar flex min-h-svh w-full justify-center">
            <Toaster position="top-center" richColors closeButton/>
            <div className="rounded-xl border bg-card text-card-foreground shadow p-6 max-w-sm w-full h-fit mt-[15%]">
                <h1 className="font-medium mb-6 text-xl">{page.props.title}</h1>
                {page.props.description && (
                <p className="font-thin mb-6 text-xs pb-10">
                    {page.props.description}
                </p>
                )}
                <form onSubmit={submit}>
                    <div className="grid gap-5">
                        <InputError message={errors.captchaSolution}/>
                        <div className="grid gap-4">
                            <Label htmlFor="login">{page.props.login}</Label>
                            <div className="relative">
                                <Icon iconNode={User} className="size-5 absolute inset-2"/>
                                <Input
                                    id="login"
                                    className={`pl-10 ${errors.login ? 'border-red-500' : ''}`}
                                    type="text"
                                    required
                                    tabIndex={1}
                                    autoComplete="username"
                                    value={data.login}
                                    disabled={processing || captchaProcessing}
                                    onChange={(e) => {
                                        handleChangeDate('login', e.target.value)
                                    }}
                                    placeholder={page.props.login}
                                />
                                <InputError message={errors.login}/>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            <Label htmlFor="login">{page.props.password}</Label>
                            <div className="relative">
                                <Icon iconNode={User} className="size-5 absolute inset-2"/>
                                <Input
                                    id="password"
                                    className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
                                    type="password"
                                    required
                                    disabled={processing || captchaProcessing}
                                    tabIndex={1}
                                    autoComplete="current-password"
                                    value={data.password}
                                    onChange={(e) => {
                                        handleChangeDate('password', e.target.value)
                                    }}
                                    placeholder={page.props.password}
                                />
                                <InputError message={errors.password}/>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button type="submit" className="w-fit"
                                    disabled={processing || captchaProcessing}>{page.props.submitButton}</Button>
                            {page.props.registerLink && <Button asChild variant="outline">
                                <Link href={page.props.registerLink.link}
                                      className={`${processing || captchaProcessing} ? 'pointer-events-none opacity-50' : ''`}>{page.props.registerLink.title}</Link>
                            </Button>}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-4 mt-6 flex items-center space-x-4">
                        <div className="relative">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500"
                                     fill="none"
                                     viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                          d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/>
                                </svg>
                            </div>
                            <div className={`${captchaProcessing ? '' : 'hidden'}`}>
                                <Icon iconNode={Loader2} className="animate-spin size-6 absolute inset-0 m-auto !text-gray-600"/>
                            </div>
                        </div>
                        <div className="text-gray-600 font-semibold">
                            {captchaMessage}
                        </div>
                        <div
                            className={`transition-opacity ${showCheckmark ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                            <svg id="checkmark" xmlns="http://www.w3.org/2000/svg"
                                 className="h-8 w-8 text-green-500"
                                 viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path className="checkmark" strokeLinecap="round" strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
