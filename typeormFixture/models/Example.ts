import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Test } from "./Test";

@Entity()
export class Example {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@ManyToOne(() => Test, (test) => test.examples)
	owner: Test;

	@Column("simple-json", { nullable: true })
	gallery: any;

	@Column("simple-json", { nullable: true })
	files: any;
}
