import {useContext} from "react";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";

interface Media {
    id: number,
    title: string,
    mimeType: string,
}

interface TileProps {
    mediaList: Media[]
}

const Tile = ({mediaList}: TileProps) => {
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
                    <img src={imageUrl((media))} alt=""/>
                </div>
            ))}
        </div>
    )
}
export default Tile