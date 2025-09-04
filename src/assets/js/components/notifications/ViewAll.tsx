import {SharedData} from "@/types";
import {usePage} from "@inertiajs/react";
import {useEffect, useState} from "react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {LoaderCircle} from "lucide-react";
import General from "@/components/notifications/General.tsx";
import System from "@/components/notifications/System.tsx";
import axios from "axios";
import {INotification} from "../../../../interfaces/types.ts";

interface NotificationProps extends SharedData {
    title: string
    tooltip: string
    notWidgets: string
    notFound: string
    actionsTitles: Record<string, string>
    searchPlaceholder: string
}

const ViewAll = () => {
    const page = usePage<NotificationProps>()
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<string>('general');
    const [pendingTab, setPendingTab] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<INotification[]>([])

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await axios.get(`${window.routePrefix}/api/notifications/general`)
                setNotifications(res.data)
            } catch (error) {
                if (error instanceof Error) {
                    console.error('Error fetching data:', error.message);
                }
            }
        }
        fetchData().finally(() => {
            setLoading(false)
        })
    }, []);

    const handleChange = async (tab: string) => {
        setActiveTab(tab);
        setPendingTab(tab);
        setLoading(true);
        try {
            const res = await axios.get(`${window.routePrefix}/api/notifications/${tab}`)
            setNotifications(res.data)
        } catch (e) {
            console.error(e);
        } finally {
            setPendingTab(null);
            setLoading(false);
        }
    }

    // Render content
    const renderContent = (viewType: 'general' | 'system') => {
        if (loading && notifications.length === 0) {
            return <LoaderCircle className="mx-auto mt-14 size-12 animate-spin"/>;
        }
        if (notifications.length === 0) {
            return <div className="text-center font-medium mt-8">
                {/*{messages["No media found"]}*/}
                No media found
            </div>;
        }
        return viewType === 'general'
            ? <General notifications={notifications} />
            : <System notifications={notifications} />;
    };

    return (
        <div
            className="h-full p-4">
            <div className="flex flex-col gap-4">
                <h1 className="font-bold text-xl">{page.props.title}</h1>
                <Tabs value={activeTab} className="w-full">
                    <TabsList className="w-full">
                        <TabsTrigger
                            value="general"
                            onClick={() => handleChange('general')}
                            disabled={!!pendingTab}
                        >
                            General
                        </TabsTrigger>
                        <TabsTrigger
                            value="system"
                            onClick={() => handleChange('system')}
                            disabled={!!pendingTab}
                        >
                            System
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="general">{renderContent('general')}</TabsContent>
                    <TabsContent value="system">{renderContent('system')}</TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

export default ViewAll