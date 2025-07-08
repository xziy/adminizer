import {Input} from "@/components/ui/input.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {useContext, useEffect, useState} from "react";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import axios from "axios";
import Tile from "@/components/media-manager/Tile.tsx";

const Gallery = () => {
    const [mediaType, setMediaType] = useState<string>('all');
    const { uploadUrl, group } = useContext(MediaManagerContext);
    const [count, setCount] = useState<number>(5);
    const [mediaList, setMediaList] = useState<any>([]);

    useEffect( () => {
        const getData = async () => {
            let data = await axios.get(`${uploadUrl}?count=${count}&skip=0&type=all&group=${group}`)
            setMediaList(data.data.data)
        }
        getData();
    }, []);

    return (
        <div className="flex justify-between mt-8 gap-4">
            <Tabs defaultValue="tile-all" className="w-full">
                <div className="flex gap-4">
                    <div>
                        <Input
                            type="search"
                            autoFocus={false}
                            placeholder='Search'
                            className="w-[200px] p-2 border rounded order-1 xl:order-2"
                        />
                    </div>
                    <TabsList>
                        <TabsTrigger value="tile-image" onClick={() => setMediaType('image')}>
                            Images
                        </TabsTrigger>
                        <TabsTrigger value="tile-video" onClick={() => setMediaType('video')}>
                            Video
                        </TabsTrigger>
                        <TabsTrigger value="table-text" onClick={() => setMediaType('text')}>
                            Text
                        </TabsTrigger>
                        <TabsTrigger value="table-application"
                                     onClick={() => setMediaType('application')}>
                            Application
                        </TabsTrigger>
                        <TabsTrigger value="table-all" onClick={() => setMediaType('all')}>
                            Table
                        </TabsTrigger>
                        <TabsTrigger value="tile-all" onClick={() => setMediaType('all')}>
                            Tile
                        </TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="tile-image">
                    <Tile mediaList={mediaList}/>
                </TabsContent>
                <TabsContent value="tile-video">Tile {mediaType}</TabsContent>
                <TabsContent value="tile-text">Tile {mediaType}</TabsContent>
                <TabsContent value="table-text">Table {mediaType}</TabsContent>
                <TabsContent value="table-application">Table {mediaType}</TabsContent>
                <TabsContent value="tile-all">
                    <Tile mediaList={mediaList}/>
                </TabsContent>
                <TabsContent value="table-all">Table {mediaType}</TabsContent>
            </Tabs>
        </div>
    )
}

export default Gallery