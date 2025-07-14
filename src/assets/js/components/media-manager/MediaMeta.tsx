import React, {useContext, useEffect, useState} from "react";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import axios from "axios";
import {Media, MediaMeta} from "@/types";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";

interface MediaMetaProps {
    media: Media
}

const MediaMetaForm = ({media}: MediaMetaProps) => {
    const {uploadUrl} = useContext(MediaManagerContext);
    const [metaItems, setMetaItems] = useState<MediaMeta[]>([]);

    useEffect(() => {
        const getMeta = async () => {
            try {
                const res = await axios.post(uploadUrl, {
                    item: media,
                    _method: 'getMeta'
                })
                setMetaItems(res.data.data)
            } catch (error) {
                console.error('Error fetching meta:', error);
            }
        };

        if (media) getMeta();
    }, [media]);

    const capitalize = (title: string) => {
        return title.charAt(0).toUpperCase() + title.slice(1);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        console.log(data)
        // try {
        //     await axios.post(uploadUrl, {
        //         item: media,
        //         data,
        //         _method: 'addMeta'
        //     });
        // } catch (error) {
        //     console.error('Error saving meta:', error);
        // }
    };

    return (
        <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit} id="form-meta">
            {metaItems.length > 0 &&
                metaItems.map((item) => (
                    <div key={item.key} className="flex flex-col gap-4">
                        <Label htmlFor={item.key}>{capitalize(item.key)}</Label>
                        <Input
                            id={item.key}
                            name={item.key}
                            defaultValue={item.value as string}
                        />
                    </div>
                ))}
            <Button className="mt-8 w-fit" type="submit" form="form-meta">
                Save
            </Button>
        </form>
    )
}

export default MediaMetaForm