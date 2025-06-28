import { Appearance, useAppearance } from '@/hooks/use-appearance';
import { Button } from './ui/button';
import { Icon } from './icon';
import { Moon, Sun, Monitor } from 'lucide-react';

export function ThemeSwitcher() {
    const { appearance, updateAppearance } = useAppearance();

    const nextAppearance: Record<Appearance, Appearance> = {
        light: 'dark',
        dark: 'system',
        system: 'light',
    };

    const icons: Record<Appearance, any> = {
        light: Sun,
        dark: Moon,
        system: Monitor,
    };

    const handleClick = () => updateAppearance(nextAppearance[appearance]);

    const CurrentIcon = icons[appearance];

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            className="shrink-0"
        >
            <Icon iconNode={CurrentIcon} />
        </Button>
    );
}

export default ThemeSwitcher;
