import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class JsonSchema {
	@PrimaryGeneratedColumn()
	id: number;

	@Column("simple-json")
	data: any;
}
