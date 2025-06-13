import React from "react";
import {
    DialogStack,
    DialogStackBody,
    DialogStackContent,
    DialogStackOverlay
} from "@/components/ui/dialog-stack.tsx";
import {LoaderCircle} from "lucide-react";
import AddForm from "@/components/add-form.tsx";
import NavItemAdd from "@/components/catalog/navigation/item-add.tsx";
import NavLinkGropuAdd from "@/components/catalog/navigation/group-link-add.tsx";
import SelectCatalogItem from "@/components/catalog/select-catalog-item.tsx";
import {CatalogItem} from "@/types";

interface CatalogDialogStackProps {
    dialogRef: React.RefObject<any>;
    PopupEvent: string | null;
    firstRender: boolean;
    secondRender: boolean;
    popupType: string;
    addProps: any;
    editModel: (record: any, targetBlank?: boolean) => Promise<void>;
    popUpTargetBlank: boolean;
    isNavigation: boolean;
    messages: Record<string, string>;
    DynamicComponent: React.ReactElement | null;
    addLinksGroupProps: any;
    reloadCatalog: (item?: any) => Promise<void>;
    itemType: string | null;
    parentid: string | number;
    addItemProps: any;
    getAddModelJSON: (model: string) => Promise<void>;
    addModel: (record: any, targetBlank?: boolean) => Promise<void>;
    items: CatalogItem[];
    selectCatalogItem: (type: string) => Promise<void>;
}

const CatalogDialogStack: React.FC<CatalogDialogStackProps> = ({
                                                                   dialogRef,
                                                                   PopupEvent,
                                                                   firstRender,
                                                                   secondRender,
                                                                   popupType,
                                                                   addProps,
                                                                   editModel,
                                                                   popUpTargetBlank,
                                                                   isNavigation,
                                                                   messages,
                                                                   DynamicComponent,
                                                                   addLinksGroupProps,
                                                                   reloadCatalog,
                                                                   itemType,
                                                                   parentid,
                                                                   addItemProps,
                                                                   getAddModelJSON,
                                                                   addModel,
                                                                   items,
                                                                   selectCatalogItem
                                                               }) => {
    return (
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
                                {!firstRender ? (
                                    <>
                                        {popupType === 'model' &&
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
                                                callback={(item) => {
                                                    dialogRef.current?.close()
                                                    reloadCatalog(item)
                                                }}
                                                update={true}
                                                type="group"
                                                {...addLinksGroupProps}
                                            />
                                        }
                                        {popupType === 'navigation.link' &&
                                            <NavLinkGropuAdd
                                                callback={(item) => {
                                                    dialogRef.current?.close()
                                                    reloadCatalog(item)
                                                }}
                                                update={true}
                                                type="link"
                                                {...addLinksGroupProps}
                                            />
                                        }
                                        {popupType === 'component' &&
                                            <>
                                                {DynamicComponent}
                                            </>
                                        }
                                    </>
                                ) : (
                                    <LoaderCircle
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 animate-spin"/>
                                )}
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
                                {popupType === 'model' &&
                                    <NavItemAdd
                                        add={getAddModelJSON}
                                        callback={() => {
                                            dialogRef.current?.close()
                                            reloadCatalog(null)
                                        }}
                                        type={itemType ?? ''}
                                        parentId={parentid}
                                        isNavigation={isNavigation}
                                        {...addItemProps}
                                    />
                                }
                                {popupType === 'navigation.group' &&
                                    <NavLinkGropuAdd
                                        callback={(item) => {
                                            dialogRef.current?.close()
                                            reloadCatalog(item)
                                        }}
                                        type="group"
                                        parentId={parentid}
                                        {...addLinksGroupProps}
                                    />
                                }
                                {popupType === 'navigation.link' &&
                                    <NavLinkGropuAdd
                                        callback={(item) => {
                                            dialogRef.current?.close()
                                            reloadCatalog(item)
                                        }}
                                        type="link"
                                        parentId={parentid}
                                        {...addLinksGroupProps}
                                    />
                                }
                                {popupType === 'component' &&
                                    <>
                                        {DynamicComponent}
                                    </>
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
    );
};

export default CatalogDialogStack;