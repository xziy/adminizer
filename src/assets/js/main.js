import {register} from 'swiper/element/bundle';
import { AdminPopUp } from '@js/pop-up/admin-pop-up.js'
import {window} from "@interactjs/utils/window.js";
import ky from 'ky';
import 'material-icons/iconfont/material-icons-outlined.woff2'
import { ItcCollapse } from "./collapse.js";


// register Swiper custom elements
register();

window.AdminPopUp = AdminPopUp
window.ky = ky

//dark-mode
const dark = localStorage.getItem('__dark-mode')
const html = document.querySelector('html')

if (dark === '1') {
    html.classList.add('dark')
}

//aside resize
const left_offset = localStorage.getItem('__left_offset')

let stylesheet = document.createElement("style");

if (left_offset) {
    stylesheet.innerText = `.content-resize { grid-template-columns: ${left_offset}px 8px 1fr; }`
} else {
    stylesheet.innerText = `.content-resize { grid-template-columns: 252px 8px 1fr; }`
}
document.head.appendChild(stylesheet);


document.addEventListener('DOMContentLoaded', function () {
    // aside menu
    const menuItems = Array.from(document.querySelectorAll(".menu__has-sub"))
    if (menuItems.length) {
        menuItems.forEach((m_item) => {
            m_item.addEventListener("click", function(e) {
                e.preventDefault()
                menuItems.forEach((elem) => {
                    if (this !== elem) {
                        elem.classList.remove('menu__has-sub--active')
                        const el = elem.nextElementSibling
                        const collapse = new ItcCollapse(el, 200);
                        collapse.hide()
                    } else {
                        this.classList.toggle('menu__has-sub--active')
                        const el = this.nextElementSibling
                        const collapse = new ItcCollapse(el, 200);
                        collapse.toggle()
                    }
                })
            })
        })
    }

    // aside resize
    const content_resize = document.querySelector('.content-resize');
    const body = document.body;
    const leftResize = document.querySelector('.left-resize');

    leftResize.addEventListener('mousedown', function () {
        const wrapper = document.querySelector('.wrapper');

        function onMouseMove(e) {
            if (window.innerWidth / 2 >= e.pageX && e.pageX >= 252) {
                localStorage.setItem('__left_offset', e.pageX);
                content_resize.style.gridTemplateColumns = `${e.pageX}px 8px 1fr`;
                body.classList.add('user-select-none');
            }
        }

        wrapper.addEventListener('mousemove', onMouseMove);

        document.documentElement.addEventListener('mouseup', function () {
            wrapper.removeEventListener('mousemove', onMouseMove);
            body.classList.remove('user-select-none');
        });
    });

    window.addEventListener('resize', function () {
        const aside = document.querySelector('.aside');
        if (aside.offsetWidth > window.innerWidth / 2) {
            content_resize.style.gridTemplateColumns = '252px 8px 1fr';
            localStorage.setItem('__left_offset', '252');
        }
    });

    // mobile-menu
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('burger')) {
            event.target.classList.toggle('burger--active');
            document.querySelector('.aside').classList.toggle('aside--active');
            document.body.classList.toggle('body-hidden');
        }
    });

    // dark-mode toggle
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('dark-mode')) {
            const isDarkMode = localStorage.getItem('__dark-mode') === '1';
            localStorage.setItem('__dark-mode', isDarkMode ? '0' : '1');
            document.documentElement.classList.toggle('dark');
        }
    });

    // active elem aside
    const url = window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
    document.querySelectorAll('.aside a').forEach(function (link) {
        const linkUrl = link.href.substring(link.href.lastIndexOf('/') + 1);

        if (url === linkUrl && window.location.href.indexOf('form') >= 0) {
            link.closest('.menu__item').classList.add('bg-white', 'dark:bg-blue-700');
        } else if (url === linkUrl) {
            link.classList.add('active');
        }
    });
});
