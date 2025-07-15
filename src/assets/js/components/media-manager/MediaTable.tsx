import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {Media, MediaMeta, MediaProps} from "@/types";
import Image from "@/components/media-manager/Image.tsx";


const imagesTypes = new Set([
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

const MediaTable = ({mediaList, messages, openMeta, crop}: MediaProps) => {
    const getDate = (t: string) => {
        let date = new Date(t);
        return date.toLocaleDateString();
    }
    const fileType = (media: Media) => {
        const fileName = media.url.split(/[#?]/)[0];
        const parts = fileName.split(".");
        return parts.pop()?.toLowerCase().trim();
    }
    const imageSize = (meta: MediaMeta[]) => {
        let size = meta.find((e) => e.key === "imageSizes") as Record<string, any>;
        if (size) {
            return `${size.value.width}x${size.value.height}`;
        } else {
            return "---";
        }
    }
    return (
        <Table wrapperHeight="max-h-full">
            <TableHeader className="sticky top-0 bg-background shadow">
                <TableRow>
                    <TableHead className="p-2 text-left">{messages["File"]}</TableHead>
                    <TableHead className="p-2 text-left">{messages["Name"]}</TableHead>
                    <TableHead className="p-2 text-left">{messages["Date"]}</TableHead>
                    <TableHead className="p-2 text-left">{messages["Type"]}</TableHead>
                    <TableHead className="p-2 text-left">{messages["Size (orig.)"]}</TableHead>
                    <TableHead className="p-2 text-left">{messages["W x H (orig.)"]}</TableHead>
                    <TableHead className="p-2 text-left">{messages["Sizes/Ver"]}</TableHead>
                    <TableHead className="p-2 text-left">{messages["Locales"]}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {mediaList.map((media) => (
                    <TableRow key={media.id}>
                        <TableCell className="p-2">
                            <Image media={media} messages={messages} openMeta={openMeta} crop={crop} className="max-w-[75px]"/>
                        </TableCell>
                        <TableCell className="p-2">
                            {media.filename}
                        </TableCell>
                        <TableCell className="p-2">
                            {getDate(media.createdAt)}
                        </TableCell>
                        <TableCell className="p-2">
                            {fileType(media)}
                        </TableCell>
                        <TableCell className="p-2">
                            {(media.size / 1024 / 1024).toFixed(4)}
                            Mb
                        </TableCell>
                        <TableCell className="p-2">
                            {imageSize(media.meta)}
                        </TableCell>
                        <TableCell className="p-2">
                            {media.variants.length > 0 ? (
                                media.variants.map((v) => (
                                    <div key={v.id}>
                                        {imagesTypes.has(v.mimeType) ? (
                                            <div>
                                                {imageSize(v.meta)}
                                            </div>
                                        ) : (
                                            /^ver:/.test(
                                                v.tag,
                                            ) && v.tag
                                        )}
                                    </div>
                                ))
                            ) : (
                                <span>---</span>
                            )}
                        </TableCell>
                        <TableCell className="p-2">
                            {media.variants.length > 0 ? (
                                media.variants.map((v) => (
                                    <div key={v.id}>
                                        {
                                            /^loc:/.test(v.tag) &&
                                            v.tag.replace("loc:", "")
                                        }
                                    </div>
                                ))
                            ) : (
                                <span>---</span>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
export default MediaTable