import {MediaProps} from "@/types";
import Image from "@/components/media-manager/Image.tsx";

const Tile = ({mediaList, messages, openMeta}: MediaProps) => {

    return (
        <div className="grid grid-cols-[repeat(auto-fill,_150px)] gap-2 justify-start">
            {mediaList.map((media) => (
                <div key={media.id}>
                    <Image media={media} messages={messages} openMeta={openMeta} className="max-w-[150px]"/>
                </div>
            ))}
        </div>
    )
}
export default Tile