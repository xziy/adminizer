import { NotificationTable } from './NotificationTable';
import {NotificationProps} from "@/types";

const General = ({ notifications, onMarkAsRead, onLoadMore, hasMore, loadingMore, messages }: NotificationProps) => {
    return (
        <NotificationTable
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            loadingMore={loadingMore}
            messages={messages}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            showDiff={false}
        />
    );
};

export default General;