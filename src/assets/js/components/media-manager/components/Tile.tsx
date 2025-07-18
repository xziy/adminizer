import {MediaProps} from "@/types";
import Image from "@/components/media-manager/components/Image.tsx";

const Tile = ({mediaList, messages, openMeta, crop, openVariant, destroy}: MediaProps) => {

    return (
        <div className="grid grid-cols-[repeat(auto-fill,_150px)] gap-2 justify-start">
            {mediaList.map((media) => (
                <div key={media.id}>
                    <Image media={media} messages={messages} openMeta={openMeta} crop={crop} openVariant={openVariant} destroy={destroy} className="max-w-[150px]"/>
                </div>
            ))}
        </div>
    )
}
export default Tile