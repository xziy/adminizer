import { NotificationTable } from './NotificationTable';
import {NotificationProps} from "@/types";

const General = ({ notifications, onMarkAsRead, onLoadMore, hasMore }: NotificationProps) => {
    return (
        <NotificationTable
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onLoadMore={onLoadMore}
            hasMore={hasMore}
            showDiff={false}
        />
    );
};

export default General;