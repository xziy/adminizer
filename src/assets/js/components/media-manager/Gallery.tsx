import {Input} from "@/components/ui/input.tsx";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {useContext, useEffect, useState, forwardRef, useImperativeHandle,} from "react";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import axios from "axios";
import Tile from "@/components/media-manager/Tile.tsx";
import MediaTable from "@/components/media-manager/MediaTable.tsx";
import {Media} from "@/types";
import {Button} from "@/components/ui/button.tsx";
import {LoaderCircle} from "lucide-react";

export interface GalleryRef {
    pushMediaItem: (item: Media) => void;
}

interface GalleryProps {
    openMeta: (media: Media) => void;
    messages: Record<string, string>;
}

const Gallery = forwardRef<GalleryRef, GalleryProps>(({openMeta, messages}, ref) => {
    const [activeTab, setActiveTab] = useState<string>('tile-all');
    const [mediaType, setMediaType] = useState<string>('all');
    const {uploadUrl, group} = useContext(MediaManagerContext);
    const [count, setCount] = useState<number>(5);
    const [mediaList, setMediaList] = useState<Media[]>([]);
    const [isLoadMore, setIsLoadMore] = useState<boolean>(false);
    const [skip, setSkip] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [pendingTab, setPendingTab] = useState<string | null>(null);



    // Загрузка данных при монтировании
    useEffect(() => {
        const fetchData = async () => {
            const {data} = await axios.get(`${uploadUrl}?count=${count}&skip=0&type=all&group=${group}`);
            setMediaList(data.data);
            // console.log(data.data);
            setIsLoadMore(data.next);
        };

        const initGallery = async () => {
            try {
                setLoading(true);
                await fetchData();
            } catch (error) {
                console.error('Error initializing media:', error);
            } finally {
                setLoading(false);
            }
        };

        initGallery();

    }, []);

    // Метод для добавления нового медиа
    const pushMediaItem = (item: Media) => {
        setSkip(prev => prev + 1);
        setMediaList(prev => [item, ...prev]);
    };

    useImperativeHandle(ref, () => ({
        pushMediaItem
    }));

    // Смена типа медиа
    const handleChange = async (type: string, tabValue: string) => {
        setPendingTab(tabValue);
        setMediaList([]);
        setLoading(true);
        setSkip(0);
        setMediaType(type);
        try {
            const {data} = await axios.get(`${uploadUrl}?count=${count}&skip=0&type=${type}&group=${group}`);
            setMediaList(data.data);
            setIsLoadMore(data.next);
            setActiveTab(tabValue); // Change active tab
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setPendingTab(null);
        }
    };

    const loadMore = async () => {
        setLoading(true);
        try {
            const newSkip = skip + count;
            const {data} = await axios.get(`${uploadUrl}?count=${count}&skip=${newSkip}&type=${mediaType}&group=${group}`);
            setMediaList(prev => [...prev, ...data.data]);
            setIsLoadMore(data.next);
            setSkip(newSkip);
        } catch (error) {
            console.error("Ошибка подгрузки медиа:", error);
        } finally {
            setLoading(false);
        }
    };

    // Render content
    const renderContent = (viewType: 'tile' | 'table') => {
        if (loading && mediaList.length === 0) {
            return <LoaderCircle className="mx-auto mt-14 size-12 animate-spin"/>;
        }
        return viewType === 'tile'
            ? <Tile mediaList={mediaList} messages={messages} openMeta={openMeta}/>
            : <MediaTable mediaList={mediaList} messages={messages} openMeta={openMeta}/>;
    };

    return (
        <div className="flex justify-between mt-8 gap-4 px-2 pb-4">
            <Tabs value={activeTab} className="w-full">
                <div className="flex gap-4 mb-4">
                    <Input
                        type="search"
                        placeholder={messages["Search"]}
                        className="w-[200px] p-2 border rounded"
                    />
                    <TabsList className="w-full">
                        <TabsTrigger
                            value="tile-image"
                            onClick={() => handleChange('image', 'tile-image')}
                            disabled={!!pendingTab}
                        >
                            {messages["Images"]}
                        </TabsTrigger>
                        <TabsTrigger
                            value="table-video"
                            onClick={() => handleChange('video', 'table-video')}
                            disabled={!!pendingTab}
                        >
                            {messages["Videos"]}
                        </TabsTrigger>
                        <TabsTrigger
                            value="table-text"
                            onClick={() => handleChange('text', 'table-text')}
                            disabled={!!pendingTab}
                        >
                            {messages["Texts"]}
                        </TabsTrigger>
                        <TabsTrigger
                            value="table-application"
                            onClick={() => handleChange('application', 'table-application')}
                            disabled={!!pendingTab}
                        >
                            {messages["Applications"]}
                        </TabsTrigger>
                        <TabsTrigger
                            value="table-all"
                            onClick={() => handleChange('all', 'table-all')}
                            disabled={!!pendingTab}
                        >
                            {messages["Table"]}
                        </TabsTrigger>
                        <TabsTrigger
                            value="tile-all"
                            onClick={() => handleChange('all', 'tile-all')}
                            disabled={!!pendingTab}
                        >
                            {messages["Tile"]}
                        </TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="tile-image">{renderContent('tile')}</TabsContent>
                <TabsContent value="table-video">{renderContent('table')}</TabsContent>
                <TabsContent value="table-text">{renderContent('table')}</TabsContent>
                <TabsContent value="table-application">{renderContent('table')}</TabsContent>
                <TabsContent value="tile-all">{renderContent('tile')}</TabsContent>
                <TabsContent value="table-all">{renderContent('table')}</TabsContent>
                {isLoadMore && !pendingTab && (
                    <div className="mt-4 mx-auto relative">
                        <Button
                            className="w-fit"
                            onClick={loadMore}
                            disabled={loading}
                        >
                            {messages["Load more"]}
                        </Button>
                        {loading &&
                            <LoaderCircle className="size-6 animate-spin absolute -right-7 top-1/2 -translate-y-1/2"/>}
                    </div>
                )}
            </Tabs>
        </div>
    );
});

Gallery.displayName = 'Gallery';
export default Gallery;