import {INotification} from "../../../../interfaces/types.ts";

interface GeneralProps {
    notifications: INotification[]
}

const General = ({notifications}: GeneralProps) => {
    return (
        <div>
            <pre>
                {JSON.stringify(notifications, null, 2)}
            </pre>
        </div>
    )
}
export default General