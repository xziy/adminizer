import {Label} from "@/components/ui/label.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {CatalogContext} from "@/components/catalog/catalogUI/CatalogContext.ts";
import {useContext, useState} from "react";
import {CatalogItem} from "@/types";

interface ItemProps{
    items: CatalogItem[],
    onSelect: (type: string) => void
}

const SelectCatalogItem = ({items, onSelect}: ItemProps) => {
    const context = useContext(CatalogContext);
    const [selectedValue, setSelectedValue] = useState("");

    // const checkPermission = (type: string) => {
    //     console.log(type)
    //     // if (props.selectedNode.length && props.movingGroupsRootOnly) {
    //     //     return type === 'group'
    //     // } else{
    //     //     return false
    //     // }
    //     return false
    // }

    const handleSelect = (value: string) => {
        setSelectedValue(value);
        onSelect(value);
        setSelectedValue("");
    };

    return (
        <div className="p-8">
            <Label className="mb-4">{context.messages["Select Item type"]}</Label>
            <Select onValueChange={handleSelect} value={selectedValue}>
                <SelectTrigger className="w-full max-w-[170px] cursor-pointer">
                    <SelectValue placeholder={context.messages["Select Ids"]}/>
                </SelectTrigger>
                <SelectContent>
                    {items.map((item) => (
                        <SelectItem value={item.type}
                                    key={`${item.type}-${item.name}`}>{item.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
export default SelectCatalogItem
