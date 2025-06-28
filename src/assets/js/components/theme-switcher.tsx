import { Appearance, useAppearance } from '@/hooks/use-appearance';
import { Button } from './ui/button';
import { Icon } from './icon';
import { Moon, Sun, Monitor } from 'lucide-react';

export function ThemeSwitcher() {
    const { appearance, updateAppearance } = useAppearance();

    const handleChange = (mode: Appearance) => () => updateAppearance(mode);

    const buttonVariant = (mode: Appearance) => (appearance === mode ? 'secondary' : 'ghost');

    return (
        <div className="flex gap-1">
            <Button
                variant={buttonVariant('light')}
                size="icon"
                onClick={handleChange('light')}
                className="shrink-0"
            >
                <Icon iconNode={Sun} />
            </Button>
            <Button
                variant={buttonVariant('dark')}
                size="icon"
                onClick={handleChange('dark')}
                className="shrink-0"
            >
                <Icon iconNode={Moon} />
            </Button>
            <Button
                variant={buttonVariant('system')}
                size="icon"
                onClick={handleChange('system')}
                className="shrink-0"
            >
                <Icon iconNode={Monitor} />
            </Button>
        </div>
    );
}

export default ThemeSwitcher;
