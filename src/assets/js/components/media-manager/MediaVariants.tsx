import {Media, MediaMeta} from "@/types";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {Label} from "@/components/ui/label.tsx";
import React, {useContext, useEffect, useState} from "react";
import {Input} from "@/components/ui/input.tsx";
import VariantDropZone from "@/components/media-manager/VariantDropZone.tsx";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import {Button} from "@/components/ui/button.tsx";
import {LoaderCircle, Trash2} from "lucide-react";
import axios from "axios";

interface MediaVariantsProps {
    item: Media
    messages: Record<string, string>
}

const imagesTypes = new Set([
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

const MediaVariants = ({item, messages}: MediaVariantsProps) => {
    const {managerId, uploadUrl} = useContext(MediaManagerContext);
    const [isLocale, setIsLocale] = useState<boolean>(false);
    const [locale, setLocale] = useState<string>("");
    const [variants, setVariants] = useState<Media[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        setVariants([])
        setIsLocale(false)
        setLocale("")
        const fetchVariants = async () => {
            setIsLoading(true)
            try {
                let res = await axios.post(uploadUrl, {
                    _method: "getChildren",
                    item: item
                })
                setVariants(res.data.data)
                setIsLoading(false)
            } catch (e) {
                console.log(e)
            }
        }
        fetchVariants()
    }, [item]);

    const addVariant = (media: Media) => {
        setLocale('')
        setIsLocale(false)
        setVariants((prev) => [...prev, media]);
    }

    const imageUrl = (media: Media) => {
        if (media.mimeType && media.mimeType.split("/")[0] === 'image') {
            return `${window.routePrefix}/get-thumbs?id=${media.id}&managerId=${managerId}`;
        } else {
            const fileName = media.url.split(/[#?]/)[0];
            const parts = fileName.split(".");
            const extension = parts.pop()?.toLowerCase().trim();
            return `${window.routePrefix}/fileicons/${extension}.svg`;
        }
    }

    const imageSize = (meta: MediaMeta[]) => {
        let size = meta.find((e) => e.key === "imageSizes") as Record<string, any>;
        if (size) {
            return `${size.value.width}x${size.value.height}`;
        } else {
            return "---";
        }
    }

    const openFile = (media: Media) => {
        window.open(`/public${media.url}`, "_blank")?.focus();
    }

    const reversedVariants = [...variants].reverse();

    return (
        <div>
            <div className="flex gap-4 flex-col">
                <VariantDropZone key="variant-drop-zone" callback={addVariant} messages={messages} media={item}
                                 localeId={locale}/>
                <div className="flex gap-4 h-9 items-center">
                    <div className="flex gap-2 items-center">
                        <Checkbox
                            id="locale"
                            checked={isLocale}
                            onCheckedChange={(value) => {
                                setIsLocale(value as boolean);
                            }}
                        />
                        <Label className="cursor-pointer" htmlFor="locale">{messages["Upload a locale"]}</Label>
                    </div>
                    {isLocale &&
                        <Input
                            placeholder={messages["Locale"]}
                            value={locale}
                            onChange={(e) => setLocale(e.target.value)} className="max-w-[150px]"
                        />
                    }
                </div>
            </div>
            {isLoading ? (
                <LoaderCircle className="size-8 animate-spin mx-auto mt-8"/>
            ) : (
                variants.length > 0 ? (
                    <div className="mt-8">
                        <Table wrapperHeight="max-h-full">
                            <TableHeader className="sticky top-0 bg-background shadow">
                                <TableRow>
                                    <TableHead className="p-2 text-left">{messages["File"]}</TableHead>
                                    <TableHead className="p-2 text-left">{messages["Tag"]}</TableHead>
                                    <TableHead className="p-2 text-left">{messages["Type"]}</TableHead>
                                    <TableHead className="p-2 text-left">{messages["W x H"]}</TableHead>
                                    <TableHead className="p-2 text-center">{messages["Actions"]}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reversedVariants.map((variant, _index) => (
                                    <TableRow key={variant.id}>
                                        <TableCell className="p-2">
                                            {imagesTypes.has(variant.mimeType) ? (
                                                <img
                                                    src={imageUrl(variant)}
                                                    alt=""
                                                    className="w-full h-full max-w-[250px]"
                                                />
                                            ) : (
                                                <span>{variant.filename}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="p-2">
                                            {variant.tag}
                                        </TableCell>
                                        <TableCell className="p-2">
                                            {variant.mimeType}
                                        </TableCell>
                                        <TableCell className="p-2">
                                            {imageSize(variant.meta)}
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <div className="flex gap-2 justify-center">
                                                <Button onClick={() => openFile(variant)}>{messages["Preview"]}</Button>
                                                <Button variant="destructive">
                                                    <Trash2/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="font-medium text-center mt-8">{messages["There are no loaded variants"]}</div>
                )
            )}
        </div>
    )
}
export default MediaVariants