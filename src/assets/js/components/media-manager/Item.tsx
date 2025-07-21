import {forwardRef, HTMLAttributes} from 'react';
import type {UniqueIdentifier} from '@dnd-kit/core';

import {removeIcon} from './icons';
import styles from './Item.module.css';
import {cn} from "@/lib/utils.ts";

export enum Position {
    Before = -1,
    After = 1,
}

export enum Layout {
    Horizontal = 'horizontal',
    Vertical = 'vertical',
    Grid = 'grid',
}

export interface Props extends Omit<HTMLAttributes<HTMLButtonElement>, 'id'> {
    active?: boolean;
    clone?: boolean;
    insertPosition?: Position;
    id: UniqueIdentifier;
    index?: number;
    url: string;
    layout: Layout;

    onRemove?(): void;
}

export const Item = forwardRef<HTMLLIElement, Props>(function Page(
    {id, index, active, clone, insertPosition, layout, onRemove, style, url, ...props},
    ref
) {
    return (
        <li
            className={cn(
                styles.Wrapper,
                active && styles.active,
                clone && styles.clone,
                insertPosition === Position.Before && styles.insertBefore,
                insertPosition === Position.After && styles.insertAfter,
                layout === Layout.Vertical && styles.vertical
            )}
            style={style}
            ref={ref}
        >
            <button className={`${styles.Page} after:bg-black dark:after:bg-gray-300`} data-id={id.toString()} {...props}>
                <img src={url} alt="" className="absolute top-0 left-0 w-full h-full object-cover overflow-hidden rounded-[5px]"/>
            </button>
            {!active && onRemove ? (
                <button className={styles.Remove} onClick={onRemove}>
                    {removeIcon}
                </button>
            ) : null}
        </li>
    );
});