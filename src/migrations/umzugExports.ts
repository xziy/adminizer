import { Migration } from "../interfaces/types"
import {up as up0001, down as down0001 } from "./umzug/0001"
import {up as up0002, down as down0002 } from "./umzug/0002_create_filter_ap"
export const umzugExports: Migration[] = [
    {
        name: "0001",
        timestamp: 1757930548596,
        up: up0001,
        down: down0001
    },
    {
        name: "0002_create_filter_ap",
        timestamp: 1770019200000, // 2026-02-01
        up: up0002,
        down: down0002
    }
]
