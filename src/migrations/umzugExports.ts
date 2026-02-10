import { Migration } from "../interfaces/types"
import {up as up0001, down as down0001 } from "./umzug/0001"
import {up as up0002, down as down0002 } from "./umzug/0002"
import {up as up0003, down as down0003 } from "./umzug/0003"
import {up as up0004, down as down0004 } from "./umzug/0004"
export const umzugExports: Migration[] = [
    {
        name: "0001",
        timestamp: 1757930548596,
        up: up0001,
        down: down0001
    },
    {
        name: "0002",
        timestamp: 1770401179768,
        up: up0002,
        down: down0002
    },
    {
        name: "0003",
        timestamp: 1770518400000,
        up: up0003,
        down: down0003
    },
    {
        name: "0004",
        timestamp: 1770681600000,
        up: up0004,
        down: down0004
    }
]
