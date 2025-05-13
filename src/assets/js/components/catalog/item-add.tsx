import {Label} from "@/components/ui/label.tsx";
import {ItemAddProps} from "@/types";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";

const ItemAdd = ({...data}: ItemAddProps) => {
    return (
        <div className="p-8">
            <div className="grid gap-4">
                <Label>{data.selectTitle}</Label>
                <Select>
                    <SelectTrigger className="w-full max-w-[170px] cursor-pointer">
                        <SelectValue placeholder={data.selectTitle}/>
                    </SelectTrigger>
                    <SelectContent>
                        {data.items.map((item) => (
                            <SelectItem value={item.id.toString()}
                                        key={`${item.id}-${item.name}`}>{item.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}

export default ItemAdd
