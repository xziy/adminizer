const colorPallete: string[] = [
    'rgba(143, 116, 123, 1)', //  Darker Pastel Pink
    'rgba(105, 143, 118, 1)', //  Darker Pastel Green
    'rgba(143, 105, 105, 1)', //  Darker Pastel Red
    'rgba(105, 143, 143, 1)', //  Darker Pastel Blue
    'rgba(143, 105, 72, 1)',  //  Darker Pastel Orange
    'rgba(143, 143, 72, 1)',  //  Darker Pastel Yellow
    'rgba(124, 105, 143, 1)', //  Darker Pastel Purple
    'rgba(105, 143, 127, 1)', //  Darker Pastel Turquoise
    'rgba(143, 104, 143, 1)', //  Darker Pastel Lavender
    'rgba(143, 128, 104, 1)', //  Darker Pastel Peach
    'rgba(105, 143, 100, 1)', //  Darker Pastel Mint
    'rgba(129, 105, 143, 1)', //  Darker Pastel Lilac
    'rgba(143, 105, 143, 1)', //  Darker Pastel Magenta
    'rgba(105, 143, 143, 1)', //  Darker Pastel Cyan
    'rgba(143, 135, 105, 1)', //  Darker Pastel Apricot
    'rgba(105, 143, 135, 1)'  //  Darker Pastel Sky Blue
];

function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}

export function getDefaultColorByID(key: string | number): string {
    const hash = hashCode(key.toString());
    const index = Math.abs(hash % colorPallete.length);
    return colorPallete[index] || colorPallete[0];
}
