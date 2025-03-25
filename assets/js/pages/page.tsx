import {Head, Link, usePage} from "@inertiajs/react";

export default function Page() {
    const page = usePage();
    console.log(page)
    return (
        <>
            <Head title="Page">
                {/*<link rel="preconnect" href="https://fonts.bunny.net" />*/}
                {/*<link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />*/}
            </Head>
            <div>
                <Link
                    href="/"
                >
                    Home
                </Link>
            </div>
            <div>
                <h1>Is Page</h1>
                <div>
                    <h2>Page Props:</h2>
                    <pre>{JSON.stringify(page.props)}</pre>
                </div>
            </div>
        </>
    )
}
