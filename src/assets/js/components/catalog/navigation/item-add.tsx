import {Label} from "@/components/ui/label.tsx";
import {ItemAddProps} from "@/types";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Plus} from "lucide-react";

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
            <div className="mt-8">
                <span><b>{data.OR}</b></span>
            </div>
            <Button className="mt-8 cursor-pointer" onClick={() => data.add(data.model)}>
                <Plus />
                {data.createTitle}
            </Button>
        </div>
    )
}

export default ItemAdd
