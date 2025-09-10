import { NotificationTable } from './NotificationTable';
import {NotificationProps} from "@/types";

const System = ({ notifications, onMarkAsRead, onLoadMore, hasMore }: NotificationProps) => {
    return (
        <NotificationTable
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            showDiff={true}
        />
    );
};

export default System;