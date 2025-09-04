import {INotification} from "../../../../interfaces/types.ts";

interface SystemProps {
    notifications: INotification[]
}

const System = ({notifications}: SystemProps) => {
    return (
        <div>
            <pre>
                {JSON.stringify(notifications, null, 2)}
            </pre>
        </div>
    )
}
export default System