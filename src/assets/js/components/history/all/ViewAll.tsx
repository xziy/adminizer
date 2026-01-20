import { Button } from "@/components/ui/button";
import { SharedData } from "@/types";
import { Link, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Braces, LoaderCircle } from "lucide-react";
import { HistoryActionsAP } from "src/models/HistoryActionsAP";

interface HistoryProps extends SharedData {
    title: string,
    models: string[]
}


const ViewAll = () => {
    const page = usePage<HistoryProps>();
    const [history, setHistory] = useState<HistoryActionsAP[]>([])
    const [diffItem, setDiffItem] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeModel, setActiveModel] = useState<string>('all')

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.post(`${window.routePrefix}/history/view-all`);
                if (res.data) {
                    setHistory(res.data.data);
                }
            } catch (e) {
                console.log(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData()
    }, [])

    const changeModel = async (model: string) => {
        setLoading(true)
        try {
            const res = await axios.post(`${window.routePrefix}/history/view-all/model`, {
                model: model
            });
            if (res.data) {
                setHistory(res.data.data);
            }
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex h-auto flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex flex-col gap-4">
                <h1 className="font-bold text-xl">{page.props.title}</h1>
                <span className="font-medium">Models List</span>
                <div className="flex flex-wrap gap-4">
                    <div>
                        <Link href={`${window.routePrefix}/history/view-all`}>
                            <Button
                                variant={activeModel === 'all' ? 'default' : 'outline'}
                                className="border-1"
                            >
                                All
                            </Button>
                        </Link>
                    </div>
                    {page.props.models.map(model => (
                        <div key={model}>
                            <Button
                                variant={activeModel === model ? 'default' : 'outline'}
                                className="border-1"
                                onClick={async () => {
                                    setActiveModel(model)
                                    await changeModel(model)
                                }}
                            >
                                {model}
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="">
                    <div className="max-h-[65vh] overflow-y-auto mt-5 pr-5">
                        <Table wrapperHeight="max-h-full">
                            <TableHeader className="sticky top-0 bg-background shadow">
                                <TableRow>
                                    <TableHead className="p-2 text-left">Date</TableHead>
                                    <TableHead className="p-2 text-left">Model</TableHead>
                                    <TableHead className="p-2 text-left">id</TableHead>
                                    <TableHead className="p-2 text-left">Event</TableHead>
                                    <TableHead className="p-2 text-left">User</TableHead>
                                    <TableHead className="p-2 text-left">Diff</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="p-10 text-center">
                                            <LoaderCircle className="mx-auto size-8 animate-spin" />
                                        </TableCell>
                                    </TableRow>
                                ) : history.length > 0 ? (
                                    history.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="p-2 self-start pt-2.5">
                                                {new Date(item.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="p-2 self-start pt-2.5 capitalize">
                                                {item.modelName}
                                            </TableCell>
                                            <TableCell className="p-2 self-start pt-2.5">
                                                {item.modelId}
                                            </TableCell>
                                            <TableCell className="p-2 self-start pt-2.5 capitalize">
                                                {item.action}
                                            </TableCell>
                                            <TableCell className="p-2 self-start pt-2.5 max-w-[250px] whitespace-break-spaces">
                                                <div className="max-w-[500px] whitespace-break-spaces font-medium text-chart-3">
                                                    {item.meta}
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-2 align-middle">
                                                <Button variant="green" size="sm" onClick={() => {
                                                    // setDiffItem(item.diff);
                                                    // setDiffOpen(true);
                                                }}>
                                                    <Braces />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="p-4 text-center font-medium text-muted-foreground">
                                            История отсутствует
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default ViewAll;