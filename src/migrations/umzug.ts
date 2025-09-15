import { Migration } from "interfaces/types"
import {up as up0001, down as down0001 } from "./umzug/0001"
export const migrationsUmzug: Migration[] = [
    {
        name: "0001",
        up: up0001,
        down: down0001
    }   
]
