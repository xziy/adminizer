import {NavGroupAddProps} from "@/types";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Button} from "@/components/ui/button.tsx";
import React, {useState} from "react";
import axios from "axios";
import {LoaderCircle} from "lucide-react";

const GroupAdd = ({...data}: NavGroupAddProps) => {
    const [targetBlank, setTargetBlank] = useState<boolean>(false)
    const [formData, setFormData] = useState<Record<string, string | boolean>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true)
        try {
            const res = await axios.post('', {
                data: {
                    ...formData,
                    targetBlank,
                    parentId: '',
                    type: 'group',
                },
                _method: 'createItem'
            });
            console.log(res.data)
            setIsLoading(false)
            data.callback()
        } catch (e) {
            console.error(e);
        }
    }
    return (
        <div className="p-8">
            <form className="grid gap-6" id="group-add" onSubmit={handleSubmit}>
                <div className="flex gap-4 items-center">
                    <Checkbox
                        id="targetBlank"
                        checked={targetBlank}
                        onCheckedChange={(checked) => setTargetBlank(!!checked)}
                        className="cursor-pointer size-5"
                    />
                    <Label htmlFor="targetBlank">{data.labels.openInNewWindow}</Label>
                </div>
                <div className="grid gap-4">
                    <Label htmlFor="name">{data.labels.title}</Label>
                    <Input required={true} value={formData.name as string || ""} name="name" placeholder="Title"
                           onChange={handleChange}/>
                </div>
                {data.items.map(item => (
                    <div className="grid gap-4" key={item.name}>
                        <Label>{item.name}</Label>
                        <Input required={item.required} value={formData[item.name] as string || ""} name={item.name}
                               placeholder={item.name}
                               onChange={handleChange}/>
                    </div>
                ))}
            </form>
            <Button className="mt-8 cursor-pointer w-fit" form="group-add" type="submit">
                {data.labels.save}
                {isLoading && <LoaderCircle className="h-4 w-4 animate-spin"/>}
            </Button>
        </div>
    )
}
export default GroupAdd
