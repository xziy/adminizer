import {Label} from "@/components/ui/label.tsx";
import {NavItemAddProps} from "@/types";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Plus} from "lucide-react";
import axios from "axios";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {useState} from "react";

const ItemAdd = ({type, callback, ...data}: NavItemAddProps) => {
    const [targetBlank, setTargetBlank] = useState<boolean>(false);



    const handleSelect = async (value: string) => {
        try {
            const res = await axios.post('', {
                data: {
                    record: value,
                    parentId: 0,
                    targetBlank: targetBlank,
                    _method: 'select',
                    type: type
                },
                _method: 'createItem'
            })
            if (res.data) callback()
        } catch (e) {
            console.log(e)
        }
    }
    return (
        <div className="p-8">
            <div className="flex gap-4 flex-col">
                <div className={`grid gap-4 ${!data.items.length  ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Label>{data.labels.selectTitle}</Label>
                    <Select onValueChange={handleSelect}>
                        <SelectTrigger className="w-full max-w-[170px] cursor-pointer">
                            <SelectValue placeholder={data.labels.selectTitle}/>
                        </SelectTrigger>
                        <SelectContent>
                            {data.items.map((item) => (
                                <SelectItem value={item.id.toString()}
                                            key={`${item.id}-${item.name}`}>{item.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-4 items-center">
                    <Checkbox
                        id="targetBlank"
                        checked={targetBlank}
                        onCheckedChange={(checked) => setTargetBlank(!!checked)}
                        className="cursor-pointer size-5"
                    />
                    <Label htmlFor="targetBlank">{data.labels.openInNewWindow}</Label>
                </div>
            </div>
            <div className="mt-8">
                <span><b>{data.labels.OR}</b></span>
            </div>
            <Button className="mt-8" onClick={() => data.add(data.model)}>
                <Plus/>
                {data.labels.createTitle}
            </Button>
        </div>
    )
}

export default ItemAdd
