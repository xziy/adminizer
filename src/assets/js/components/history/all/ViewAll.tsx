import { Button } from "@/components/ui/button";
import { SharedData } from "@/types";
import { usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Braces, LoaderCircle } from "lucide-react";
import { HistoryActionsAP } from "src/models/HistoryActionsAP";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface HistoryProps extends SharedData {
    title: string,
    models: string[],
    users: {
        name: string
    }[]
}


const ViewAll = () => {
    const page = usePage<HistoryProps>();
    const [history, setHistory] = useState<HistoryActionsAP[]>([])
    // const [diffItem, setDiffItem] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeModel, setActiveModel] = useState<string>('all')
    const [offset, setOffset] = useState<number>(0);
    const [limit] = useState<number>(15);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const tableContainerRef = useRef<HTMLTableElement>(null);
    const [selectedUser, setSelectedUser] = useState<string>('all');


    const fetchHistory = async (offset: number, model: string = 'all', user: string = 'all', reset = false) => {
        setLoadingMore(true);
        try {
            const res = await axios.post(`${window.routePrefix}/history/view-all`, {
                model,
                offset,
                limit,
                user
            });

            const data = res.data.data;
            const total = res.data.total;

            if (reset) {
                setHistory(data);
            } else {
                setHistory(prev => [...prev, ...data]);
            }


            setHasMore(history.length + data.length < total);
            setOffset(offset);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        setHistory([]);
        setOffset(0);
        setHasMore(true);
        fetchHistory(0, activeModel, selectedUser, true);
        setLoading(false);
    }, [activeModel, selectedUser]);

    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (loadingMore || !hasMore) return;
            if (container.scrollHeight - container.scrollTop <= container.clientHeight + 5) {
                fetchHistory(offset + limit, activeModel);
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [loadingMore, hasMore, offset, limit, activeModel, selectedUser]);

    const handleChange = (model: string, user: string) => {
        setActiveModel(model);
        setSelectedUser(user);
        setLoading(true);
        setHistory([]);
        setOffset(0);
        setHasMore(true);
        // await fetchHistory(0, model, true);
        setLoading(false);
    };

    return (
        <div className="flex h-auto flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex flex-col gap-4">
                <h1 className="font-bold text-xl">{page.props.title}</h1>
                <span className="font-medium">Models List</span>
                <div className="flex flex-wrap gap-4">
                    <div>
                        <Button
                            variant={activeModel === 'all' ? 'default' : 'outline'}
                            className="border-1"
                            onClick={() => {
                                handleChange('all', selectedUser)
                            }}
                        >
                            All
                        </Button>
                    </div>
                    {page.props.models.map(model => (
                        <div key={model}>
                            <Button
                                variant={activeModel === model ? 'default' : 'outline'}
                                className="border-1 capitalize"
                                onClick={() => {
                                    handleChange(model, selectedUser)
                                }}
                            >
                                {model}
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-4 max-w-[250px]">
                    <Label htmlFor="users">Users</Label>
                    <Select
                        onValueChange={(value: string) => {
                            handleChange(
                                activeModel,
                                value
                            )
                        }}
                        value={selectedUser}
                    >
                        <SelectTrigger className="w-full cursor-pointer min-h-10 scroll-pt-30 scroll-mt-30" id="users">
                            <SelectValue placeholder="Users" />
                        </SelectTrigger>
                        <SelectContent className="z-[9999999]">
                            <SelectItem value="all" key="all">
                                All
                            </SelectItem>
                            {page.props.users.map(user => (
                                <SelectItem value={String(user.name)} key={String(user.name)}>
                                    {user.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="max-h-[60vh] mt-5 pr-5">
                    <Table wrapperHeight="max-h-[55vh]" ref={tableContainerRef}>
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
                            {history.map((item) => (
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
                                            {item.userName}
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
                            ))}
                            {loadingMore && (
                                <TableRow>
                                    <TableCell colSpan={6} className="p-4 text-center">
                                        <LoaderCircle className="mx-auto size-5 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loadingMore && !hasMore && history.length > 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="p-4 text-center font-medium text-muted-foreground">
                                        Больше нет данных
                                    </TableCell>
                                </TableRow>
                            )}

                            {!loadingMore && !loading && history.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="p-4 text-center font-medium text-muted-foreground">
                                        Нет записей для отображения
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div >
    )
}
export default ViewAll;