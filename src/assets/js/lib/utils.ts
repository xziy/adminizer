import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
export function simpleSanitizeHtml(html: string): string {
    return html
        // Удаляем script теги
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Удаляем iframe, embed, object
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        // Удаляем опасные атрибуты событий
        .replace(/ on\w+="[^"]*"/g, '')
        .replace(/ on\w+='[^']*'/g, '')
        .replace(/ on\w+=[^ >]+/g, '')
        // Удаляем javascript: ссылки
        .replace(/href="javascript:[^"]*"/gi, 'href="#"')
        .replace(/href='javascript:[^']*'/gi, 'href="#"');
}