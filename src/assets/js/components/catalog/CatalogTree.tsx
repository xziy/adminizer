import {createContext, type Dispatch, lazy, SetStateAction, useCallback, useEffect, useRef, useState} from "react";
import {
    Tree,
    getBackendOptions,
    MultiBackend,
    NodeModel
} from "@minoru/react-dnd-treeview";
import {DndProvider} from "react-dnd";
import axios from "axios";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Button} from "@/components/ui/button.tsx";
import {LoaderCircle, Pencil, Plus, Trash2} from "lucide-react";
import {Input} from "@/components/ui/input.tsx";
import {
    DialogStack,
    DialogStackBody,
    DialogStackContent, DialogStackHandle,
    DialogStackOverlay
} from "@/components/ui/dialog-stack.tsx";
import {Catalog, CatalogItem, Field} from "@/types";
import SelectCatalogItem from "@/components/catalog/select-catalog-item.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import AddForm from "@/components/add-form.tsx";

const NavItemAdd = lazy(() => import('@/components/catalog/navigation/item-add.tsx'));

interface CatalogContextProps {
    messages: Record<string, string>
    setMessages: Dispatch<SetStateAction<Record<string, string>>>
}

interface AddCatalogProps {
    props: {
        actions: {
            link: string;
            id: string;
            title: string;
            icon: string;
        }[];
        notFound?: string
        search?: string,
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
}

export const CatalogContext = createContext<CatalogContextProps>({
    messages: {},
    setMessages: () => {
    }
});


const CatalogTree = () => {
    const [treeData, setTreeData] = useState<NodeModel[]>([]);
    const handleDrop = (newTree: NodeModel[]) => setTreeData(newTree);

    const [catalog, setCatalog] = useState<Catalog>({
        catalogId: "",
        catalogName: "",
        catalogSlug: "",
        idList: [],
        movingGroupsRootOnly: false
    })
    const [items, setItems] = useState<CatalogItem[]>([])
    const [messages, setMessages] = useState<Record<string, string>>({})
    const [isLoading, setIsLoading] = useState(false)
    const dialogRef = useRef<DialogStackHandle>(null);
    const [addItemProps, setAddItemProps] = useState({createTitle: "", items: [], selectTitle: "", OR: "", model: ""})
    const [popupType, setPopupType] = useState<string>('')
    const [addProps, setAddProps] = useState<AddCatalogProps>({
        props: {
            actions: [],
            btnBack: {link: "", title: ""},
            btnSave: {title: ""},
            edit: false,
            fields: [],
            notFound: "",
            postLink: "",
            search: "",
            view: false,
        }
    })

    const [firstRender, setFirstRender] = useState(false)
    const [secondRender, setSecondRender] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            const res = await axios.post('', {
                _method: 'getCatalog'
            });
            const {catalog, items, toolsActions} = res.data;
            setCatalog(catalog);
            setItems(items);
        };

        const initLocales = async () => {
            let res = await axios.post('', {
                _method: 'getLocales'
            });
            setMessages(res.data.data);
        };

        const initCatalog = async () => {
            try {
                setIsLoading(true);
                await initLocales();
                await fetchData();
            } catch (error) {
                console.error('Error initializing catalog:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initCatalog();
    }, []);

    const selectCatalogItem = useCallback(async (type: string) => {
        setFirstRender(true)
        const res = await axios.post('', {type: type, _method: 'getAddHTML'})
        await getHTML(res.data)
        dialogRef.current?.next()
        setFirstRender(false)
    }, [items])

    const getHTML = useCallback(async (data: { type: string, data: any }) => {
        switch (data.type) {
            case 'navigation':
                setPopupType('navigation')
                setAddItemProps(data.data)
                break
            // case 'link':
            //     let resPost = await ky.get(data.data).text()
            //     HTML.value = resPost
            //     break
            // case 'jsonForm':
            //     JSONFormSchema.value = JSON.parse(data.data)
            //     isJsonForm.value = true
            //     break
            default:
                break
        }
    }, [items])
    const addModel = useCallback(async (model: string) => {
        setSecondRender(true)
        const res = await axios.get(`${window.routePrefix}/model/${model}/add?without_layout=true'`)
        setAddProps(res.data)
        dialogRef.current?.next()
        setSecondRender(false)
    }, [items])
    return (
        <>
            {isLoading ? (
                <>
                    <Skeleton className="h-12 w-1/4 rounded-md"/>
                    <Skeleton className="h-12 w-full rounded-md"/>
                    <Skeleton className="h-full w-full rounded-md"/>
                </>
            ) : (
                <CatalogContext.Provider value={
                    {
                        messages,
                        setMessages
                    }
                }>
                    <div className="flex gap-8 items-center mb-4">
                        <h1 className="text-[28px] leading-[36px] text-foreground">{messages[catalog.catalogName]}</h1>
                        {catalog.idList.length > 0 &&
                            <Select defaultValue={catalog.catalogId}>
                                <SelectTrigger className="w-full max-w-[170px] cursor-pointer">
                                    <SelectValue placeholder={messages["Select Ids"]}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {catalog.idList.map((id) => (
                                        <SelectItem value={id}
                                                    key={id}>{id}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        }
                    </div>
                    <div
                        className="md:grid md:grid-cols-[minmax(70px,_800px)_minmax(150px,_250px)] md:gap-10 justify-between flex flex-col gap-3.5">
                        <div className="flex gap-2">
                            <Button variant="default" size="sm" className="w-fit cursor-pointer rounded-sm"
                                    onClick={() => {
                                        dialogRef.current?.open()
                                    }}>
                                <Plus/>
                                {messages.create}
                            </Button>
                            <Button variant="outline" size="sm" className="w-fit cursor-pointer rounded-sm">
                                <Pencil/>
                                {messages.Edit}
                            </Button>
                            <Button variant="destructive" size="sm" className="w-fit cursor-pointer rounded-sm">
                                <Trash2/>
                                {messages.Delete}
                            </Button>
                        </div>
                        <div>
                            <Input
                                type="search"
                                autoFocus={false}
                                placeholder={messages.Search}
                                className="w-full max-w-[200px] p-2 border rounded"
                                // onChange={(e) => {onGlobalSearch(e.target.value)}}
                                // onKeyDown={(e) => {
                                //     if (e.key === 'Enter' && handleSearch) {
                                //         handleSearch()
                                //     }
                                // }}
                            />
                        </div>
                    </div>
                    <DndProvider backend={MultiBackend} options={getBackendOptions()}>
                        <Tree
                            tree={treeData}
                            rootId={0}
                            onDrop={handleDrop}
                            render={(node, {depth, isOpen, onToggle}) => (
                                <div style={{marginLeft: depth * 10}}>
                                    {node.droppable && (
                                        <span onClick={onToggle}>{isOpen ? "[-]" : "[+]"}</span>
                                    )}
                                    {node.text}
                                </div>
                            )}
                        />
                    </DndProvider>
                    <DialogStack ref={dialogRef}>
                        <DialogStackOverlay/>
                        <DialogStackBody>
                            <DialogStackContent>
                                <div className="relative h-full">
                                    {firstRender && <LoaderCircle
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 animate-spin"/>}
                                    <SelectCatalogItem items={items} onSelect={selectCatalogItem}/>
                                </div>
                            </DialogStackContent>

                            <DialogStackContent>
                                <div className="relative h-full">
                                    {secondRender && <LoaderCircle
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 animate-spin"/>}
                                    {popupType === 'navigation' && <NavItemAdd add={addModel} {...addItemProps} />}
                                </div>
                            </DialogStackContent>

                            <DialogStackContent>
                                <div className="h-full overflow-y-auto mt-5">
                                    <AddForm page={addProps} catalog={true} callback={dialogRef.current?.close}/>
                                </div>
                            </DialogStackContent>
                        </DialogStackBody>
                    </DialogStack>
                </CatalogContext.Provider>
            )}
        </>
    )
}
export default CatalogTree;
