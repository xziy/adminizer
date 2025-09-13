import { NotificationTable } from './NotificationTable';
import {NotificationProps} from "@/types";

const System = ({ notifications, onMarkAsRead, onLoadMore, hasMore, loadingMore, messages }: NotificationProps) => {
    return (
        <NotificationTable
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onLoadMore={onLoadMore}
            messages={messages}
            loadingMore={loadingMore}
            hasMore={hasMore}
            showDiff={true}
        />
    );
};

export default System;