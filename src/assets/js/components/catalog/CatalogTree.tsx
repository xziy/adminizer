import {lazy, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
    Tree,
    getBackendOptions,
    MultiBackend,
    NodeModel,
    TreeMethods,
    DragLayerMonitorProps, DropOptions
} from "@minoru/react-dnd-treeview";
import {DndProvider} from "react-dnd";
import axios from "axios";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Button} from "@/components/ui/button.tsx";
import {LoaderCircle, Pencil, Plus} from "lucide-react";
import {Input} from "@/components/ui/input.tsx";
import {
    DialogStack,
    DialogStackBody,
    DialogStackContent, DialogStackHandle,
    DialogStackOverlay
} from "@/components/ui/dialog-stack.tsx";
import {Catalog, CatalogItem, CustomCatalogData, Field} from "@/types";
import SelectCatalogItem from "@/components/catalog/select-catalog-item.tsx";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import AddForm from "@/components/add-form.tsx";
import CatalogNode from "@/components/catalog/CatalogNode.tsx";
import CatalogDragPreview from "@/components/catalog/CatalogDragPreview.tsx";
import styles from "@/components/catalog/Catalog.module.css";
import {Placeholder} from "@/components/catalog/CatalogPlaceholder.tsx";
import {CatalogContext} from "@/components/catalog/CatalogContext.ts";
import DeleteModal from "@/components/modals/del-modal.tsx";
import {debounce} from 'lodash-es';


const NavItemAdd = lazy(() => import('@/components/catalog/navigation/item-add.tsx'));
const NavLinkGropuAdd = lazy(() => import('@/components/catalog/navigation/group-link-add.tsx'));

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

const CatalogTree = () => {
    const treeRef = useRef<TreeMethods>(null);

    const [treeData, setTreeData] = useState<NodeModel<CustomCatalogData>[]>([]);
    const [selectedNode, setSelectedNode] = useState<NodeModel<CustomCatalogData> | null>(null);

    const [catalog, setCatalog] = useState<Catalog>({
        catalogId: "",
        catalogName: "",
        catalogSlug: "",
        idList: [],
        nodes: [],
        movingGroupsRootOnly: false
    })

    const [items, setItems] = useState<CatalogItem[]>([])
    const [messages, setMessages] = useState<Record<string, string>>({})
    const [isLoading, setIsLoading] = useState(false)
    const dialogRef = useRef<DialogStackHandle>(null);
    const [addItemProps, setAddItemProps] = useState({items: [], model: "", labels: {}})
    const [addLinksGroupProps, setAddLinksGroupProps] = useState({items: [], labels: {}})
    const [popupType, setPopupType] = useState<string>('')
    const [loadingNodeId, setLoadingNodeId] = useState<string | number | null>(null)
    const [itemType, setItemType] = useState<string | null>(null)
    const [PopupEvent, setPopupEvent] = useState<string | null>(null)

    const [popUpTargetBlank, setPopUpTargetBlank] = useState<boolean>(false)
    const [isNavigation, setIsNavigation] = useState<boolean>(false)


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
            const {catalog: resCatalog, items, toolsActions} = res.data;
            setCatalog(resCatalog);
            setItems(items);
            setTreeData(resCatalog.nodes)
            // console.log(resCatalog)
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

    const handleSelect = (node: NodeModel<CustomCatalogData>) => {
        selectedNode === node ? setSelectedNode(null) : setSelectedNode(node)
    }

    /**
     * Handle drop event
     * @callback handleDrop
     */
    const handleDrop = useCallback(async (
        newTree: NodeModel<CustomCatalogData>[],
        {dragSourceId, dropTargetId}: DropOptions<CustomCatalogData>
    ) => {
        try {
            // find dragged node
            const draggedNode = newTree.find(node => node.id === dragSourceId);

            // find new parent
            const newParentId = dropTargetId || 0;


            const requestData = {
                data: {
                    reqNode: [{
                        id: draggedNode?.id,
                        parent: newParentId,
                        text: draggedNode?.text,
                        data: draggedNode?.data
                    }],
                    reqParent: {
                        id: newParentId,
                        children: newTree.filter(node => node.parent === newParentId).map(node => ({
                            id: node.id,
                            text: node.text,
                            data: node.data
                        })),
                        data: newParentId === 0
                            ? {id: 0}
                            : newTree.find(node => node.id === newParentId)?.data
                    },
                },
                _method: 'updateTree'
            };
            setTreeData(newTree);

            await axios.put('', requestData);

        } catch (error) {
            console.error('Error updating tree:', error);
        }
    }, [treeData]);

    /**
     * Toggle the open state of a node
     * @callback handleToggle
     */
    const handleToggle = useCallback(async (id: string, isOpen: boolean) => {
        // Если нода закрывается - ничего не делаем
        if (!isOpen) return;

        try {
            setLoadingNodeId(id);
            const node = treeData.find(node => node.id === id);
            const res = await axios.post('', {data: node, _method: 'getChilds'});
            const newChildNodes = res.data.data;

            setTreeData(prevTree => {
                // Создаем Set из ID существующих нод для быстрой проверки
                const existingNodeIds = new Set(prevTree.map(n => n.id));

                // Фильтруем новые ноды, оставляем только те, которых еще нет
                const uniqueNewNodes = newChildNodes.filter(
                    (child: { id: string | number; }) => !existingNodeIds.has(child.id)
                );

                // Если все новые ноды уже есть - не обновляем состояние
                if (uniqueNewNodes.length === 0) return prevTree;

                // Мержим деревья, добавляя только уникальные ноды
                return [...prevTree, ...uniqueNewNodes];
            });

        } catch (error) {
            console.error('Error loading child nodes:', error);
        } finally {
            setLoadingNodeId(null);
        }
    }, [treeData]);

    const parentid = useMemo(() => {
        return selectedNode?.droppable ? selectedNode.id : 0;;
    }, [selectedNode])

    /**
     * Reload catalog
     */
    const reloadCatalog = useCallback(async () => {
        if (selectedNode?.droppable) {
            treeRef.current?.open(selectedNode.id)
            await handleToggle(selectedNode.id as string, true)
        } else {
            const res = await axios.post('', {
                _method: 'getCatalog'
            });
            const {catalog: resCatalog} = res.data;
            setTreeData(resCatalog.nodes)
        }
    }, [selectedNode, treeData])

    const selectCatalogItem = useCallback(async (type: string) => {
        setItemType(type)
        setFirstRender(true)
        const res = await axios.post('', {type: type, _method: 'getAddHTML'})
        setPopUpData(res.data)
        dialogRef.current?.next()
        setFirstRender(false)
    }, [items])

    const updateItem = useCallback(async () => {
        try {
            const res = await axios.post('', {
                type: selectedNode?.data?.type,
                modelId: selectedNode?.data?.modelId ?? null,
                id: selectedNode?.data?.id,
                _method: 'getEditHTML'
            })
            if (res.data) {
                // console.log(res.data.type)
                if (res.data.type.includes('navigation')) {
                    switch (res.data.type) {
                        case 'navigation.item':
                            const item = res.data.data.item
                            const resEdit = await axios.get(`${window.routePrefix}/model/${item.type}/edit/${item.modelId}?without_layout=true`)
                            setAddProps(resEdit.data)
                            setPopUpTargetBlank(item.targetBlank)
                            setIsNavigation(true)
                            setPopupType('navigation.item')
                            break
                        case 'navigation.group':

                            setAddLinksGroupProps(res.data.data)
                            setIsNavigation(true)
                            setPopupType('navigation.group')
                            break
                        case 'navigation.link':
                            setAddLinksGroupProps(res.data.data)
                            setIsNavigation(true)
                            setPopupType('navigation.link')
                            break
                        default:
                            break
                    }
                }
            }
        } catch (e) {
            console.log(e)
        }
    }, [PopupEvent, selectedNode, treeData, addProps])

    const deleteItem = useCallback(async () => {
        if (!selectedNode) return;

        try {
            const res = await axios.delete('', {data: selectedNode});
            if (res.data.data.ok) {
                // Удаляем ноду и всех её потомков из treeData
                const removeNodeAndChildren = (id: string | number, nodes: NodeModel<CustomCatalogData>[]): NodeModel<CustomCatalogData>[] => {
                    let result = nodes.filter(node => node.id !== id);

                    // Рекурсивно удаляем детей
                    const children = nodes.filter(node => node.parent === id);
                    if (children.length > 0) {
                        children.forEach(child => {
                            result = removeNodeAndChildren(child.id, result);
                        });
                    }

                    return result;
                };

                const newTreeData = removeNodeAndChildren(selectedNode.id, treeData);
                setTreeData(newTreeData);
                setSelectedNode(null);
            }
        } catch (error) {
            console.error('Error deleting node:', error);
        }
    }, [selectedNode, treeData]);

    const setPopUpData = useCallback((data: { type: string, data: any }) => {
        if (data.type.includes('navigation')) {
            setIsNavigation(true)
            switch (data.type) {
                case 'navigation.item':
                    setAddItemProps(data.data)
                    setPopupType('navigation.item')
                    break
                case 'navigation.group':
                    console.log(data.data)
                    setAddLinksGroupProps(data.data)
                    setPopupType('navigation.group')
                    break
                case 'navigation.link':
                    setAddLinksGroupProps(data.data)
                    setPopupType('navigation.link')
                    break
                default:
                    break
            }
        }
    }, [PopupEvent, selectedNode, isNavigation])


    const getAddModelJSON = useCallback(async (model: string) => {
        setSecondRender(true)
        const res = await axios.get(`${window.routePrefix}/model/${model}/add?without_layout=true'`)
        setAddProps(res.data)
        dialogRef.current?.next()
        setSecondRender(false)
    }, [itemType])

    const addModel = useCallback(async (record: any, targetBlank: boolean) => {
        record.targetBlank = targetBlank
        try {
            await axios.post('', {
                data: {
                    record: record,
                    parentId: parentid,
                    type: itemType
                },
                _method: 'createItem'
            })
        } catch (e) {
            console.log(e)
        } finally {
            dialogRef.current?.close()
            reloadCatalog()
        }
    }, [itemType, selectedNode, treeData])

    const editModel = useCallback(async (record: any, targetBlank: boolean) => {
        record[0].targetBlank = targetBlank
        record[0].treeId = selectedNode?.data?.id
        try {
            await axios.put('', {
                type: selectedNode?.data?.type,
                data: {record: record[0]},
                modelId: selectedNode?.data?.modelId,
                _method: 'updateItem'
            })
        } catch (e) {
            console.log(e)
        } finally {
            dialogRef.current?.close()
            reloadCatalog()
        }
    }, [treeData, selectedNode])

    const performSearch = async (s: string) => {
        if (!s.trim()) {
            // reloadCatalog();
            return;
        }
        try {
            const res = await axios.post('', {s: s, _method: 'search'})
            console.log(res.data)
        } catch (error) {
            console.error('Error searching:', error);
        }
    };


    const handleSearch = useCallback(
        debounce(performSearch, 500),
        [treeData, reloadCatalog]
    );

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
                            <Button variant="default" size="sm" className="w-fit rounded-sm"
                                    onClick={() => {
                                        setPopupEvent('create')
                                        dialogRef.current?.open()
                                    }}>
                                <Plus/>
                                {messages.create}
                            </Button>
                            <Button variant="outline" size="sm"
                                    className={`w-fit cursor-pointer rounded-sm ${selectedNode ? '' : 'opacity-50 pointer-events-none'}`}
                                    onClick={() => {
                                        updateItem()
                                        setPopupEvent('update')
                                        dialogRef.current?.open()
                                    }}>
                                <Pencil/>
                                {messages.Edit}
                            </Button>
                            <DeleteModal btnTitle={messages.Delete}
                                         variant="destructive"
                                         btnCLass={`w-fit text-white hover ${selectedNode ? '' : 'opacity-50 pointer-events-none'}`}
                                         delModal={
                                             {
                                                 yes: messages['Yes'],
                                                 no: messages['No'],
                                                 text: messages['Are you sure?']
                                             }
                                         }
                                         isLink={false}
                                         handleDelete={deleteItem}
                            />
                        </div>
                        <div>
                            <Input
                                type="search"
                                autoFocus={false}
                                placeholder={messages.Search}
                                className="w-full max-w-[200px] p-2 border rounded"
                                onChange={(e) => {
                                    handleSearch(e.target.value)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        performSearch(e.currentTarget.value);
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="h-full">
                        <DndProvider backend={MultiBackend} options={getBackendOptions()}>
                            <div className={styles.app}>
                                <Tree
                                    ref={treeRef}
                                    tree={treeData}
                                    rootId={0}
                                    render={(node, {depth, isOpen, onToggle}) => (
                                        <CatalogNode
                                            node={node}
                                            depth={depth}
                                            isOpen={isOpen}
                                            loading={loadingNodeId === node.id}
                                            isSelected={node.id === selectedNode?.id}
                                            onToggle={(id) => {
                                                onToggle();
                                                handleToggle(id as string, !isOpen)
                                            }}
                                            onSelect={handleSelect}
                                        />
                                    )}
                                    dropTargetOffset={5}
                                    insertDroppableFirst={false}
                                    classes={{
                                        draggingSource: styles.draggingSource,
                                        dropTarget: styles.dropTarget,
                                        placeholder: styles.placeholderContainer,
                                        root: 'py-4'
                                    }}
                                    canDrop={(_tree, {dragSource, dropTargetId}) => {
                                        if (dragSource?.parent === dropTargetId) {
                                            return true;
                                        }
                                    }}
                                    sort={false}
                                    dragPreviewRender={(
                                        monitorProps: DragLayerMonitorProps<CustomCatalogData>
                                    ) => <CatalogDragPreview monitorProps={monitorProps}/>}
                                    onDrop={handleDrop}
                                    placeholderRender={(node, {depth}) => (
                                        <Placeholder node={node} depth={depth}/>
                                    )}
                                />
                            </div>
                        </DndProvider>
                    </div>
                    <DialogStack ref={dialogRef}>
                        <DialogStackOverlay/>
                        <DialogStackBody>
                            <DialogStackContent>
                                <div className="relative h-full">
                                    {PopupEvent === 'create' && (
                                        <>
                                            {firstRender && <LoaderCircle
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 animate-spin"/>}
                                            <SelectCatalogItem items={items} onSelect={selectCatalogItem}/>
                                        </>
                                    )}
                                    {PopupEvent === 'update' &&
                                        <div className="h-full overflow-y-auto mt-5">
                                            {popupType === 'navigation.item' &&
                                                <AddForm page={addProps}
                                                         catalog={true}
                                                         callback={editModel}
                                                         openNewWindowLabel={messages["Open in a new window"]}
                                                         openNewWindow={popUpTargetBlank}
                                                         isNavigation={isNavigation}
                                                />
                                            }
                                            {popupType === 'navigation.group' &&
                                                <NavLinkGropuAdd
                                                    callback={() => {
                                                        dialogRef.current?.close()
                                                        reloadCatalog()
                                                    }}
                                                    update={true}
                                                    type="group"
                                                    {...addLinksGroupProps}
                                                />
                                            }
                                            {popupType === 'navigation.link' &&
                                                <NavLinkGropuAdd
                                                    callback={() => {
                                                        dialogRef.current?.close()
                                                        reloadCatalog()
                                                    }}
                                                    update={true}
                                                    type="link"
                                                    {...addLinksGroupProps}
                                                />
                                            }
                                        </div>
                                    }
                                </div>
                            </DialogStackContent>

                            <DialogStackContent>
                                <div className="relative h-full">
                                    {secondRender && <LoaderCircle
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 animate-spin"/>
                                    }
                                    {PopupEvent === 'create' &&
                                        <>
                                            {popupType === 'navigation.item' &&
                                                <NavItemAdd
                                                    add={getAddModelJSON}
                                                    callback={() => {
                                                        dialogRef.current?.close()
                                                        reloadCatalog()
                                                    }}
                                                    type={itemType ?? ''}
                                                    parentId={parentid}
                                                    {...addItemProps}
                                                />
                                            }
                                            {popupType === 'navigation.group' &&
                                                <NavLinkGropuAdd
                                                    callback={() => {
                                                        dialogRef.current?.close()
                                                        reloadCatalog()
                                                    }}
                                                    type="group"
                                                    parentId={parentid}
                                                    {...addLinksGroupProps}
                                                />
                                            }
                                            {popupType === 'navigation.link' &&
                                                <NavLinkGropuAdd
                                                    callback={() => {
                                                        dialogRef.current?.close()
                                                        reloadCatalog()
                                                    }}
                                                    type="link"
                                                    parentId={parentid}
                                                    {...addLinksGroupProps}
                                                />
                                            }
                                        </>
                                    }
                                </div>
                            </DialogStackContent>

                            <DialogStackContent>
                                <div className="h-full overflow-y-auto mt-5">
                                    <AddForm page={addProps}
                                             catalog={true}
                                             callback={addModel}
                                             openNewWindowLabel={messages["Open in a new window"]}
                                             isNavigation={isNavigation}
                                    />
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
