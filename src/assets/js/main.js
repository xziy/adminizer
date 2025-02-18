import {register} from 'swiper/element/bundle';
import { AdminPopUp } from '@js/pop-up/admin-pop-up.js'
import {window} from "@interactjs/utils/window.js";
import ky from 'ky'

// register Swiper custom elements
register();

window.AdminPopUp = AdminPopUp
window.ky = ky
