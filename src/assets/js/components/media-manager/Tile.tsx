import {useContext} from "react";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import {Media, MediaProps} from "@/types";

const Tile = ({mediaList}: MediaProps) => {
    const {managerId} = useContext(MediaManagerContext);

    const imageUrl = (media: Media) => {
        if (media.mimeType && media.mimeType.split("/")[0] === 'image') {
            return `${window.routePrefix}/get-thumbs?id=${media.id}&managerId=${managerId}`;
        } else {
            return ''
        }
    }

    return (
        <div className="grid grid-cols-[repeat(auto-fill,_150px)] gap-2 justify-start">
            {mediaList.map((media) => (
                <div key={media.id}>
                    <img className="w-full h-full max-w-[150px]" src={imageUrl((media))} alt=""/>
                </div>
            ))}
        </div>
    )
}
export default Tile