import Handsontable from 'handsontable';
import {EditSchedule} from './schedule/editSchedule.js'
import L from 'leaflet'
import 'leaflet-draw'
import {GeoJsonEditor} from './geojson/geojson.js'
import Choices from 'choices.js'
import Editor from '@toast-ui/editor';

window.Handsontable = Handsontable
window.EditSchedule = EditSchedule
window.L = L
window.GeoJsonEditor = GeoJsonEditor
window.toastui = {Editor}
window.Choices = Choices
