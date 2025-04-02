import {format} from "date-fns"
import {CalendarIcon} from "lucide-react"

import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {Calendar} from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    selected?: Date
    onSelect: (date?: Date) => void
    placeholder?: string
    className?: string
    buttonClassName?: string
    disabled?: boolean
    fromDate?: Date
    toDate?: Date
}

export function DatePicker({
       selected,
       onSelect,
       placeholder = "Pick a date",
       className,
       buttonClassName,
       disabled = false,
       fromDate,
       toDate,
   }: DatePickerProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-[240px] justify-start text-left font-normal cursor-pointer border-input",
                        !selected && "text-muted-foreground",
                        buttonClassName
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4"/>
                    {selected ? format(selected, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("w-auto p-0", className)} align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={onSelect}
                    initialFocus
                    fromDate={fromDate}
                    toDate={toDate}
                />
            </PopoverContent>
        </Popover>
    )
}
