import {cn} from "@/lib/utils.ts";

interface MaterialIconProps {
    name: string;
    className?: string;
}

export default function MaterialIcon({ name, className }: MaterialIconProps) {
    return <span className={cn('material-icons-outlined', className)}>{name}</span>
}
