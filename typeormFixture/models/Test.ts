import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from "typeorm";
import { Example } from "./Example";
import { User } from "./User";

@Entity()
export class Test {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({ nullable: true })
	title_2: string;

	@Column({ nullable: true })
	test_ck5_1: string;

	@Column({ default: false })
	sort: boolean;

	@Column({ default: false })
	sort_test: boolean;

	@Column("simple-json", { nullable: true })
	datatable: any;

	@Column("simple-json", { nullable: true })
	image: any;

	@Column("simple-json", { nullable: true })
	gallery: any;

	@Column("simple-json", { nullable: true })
	file: any;

	@Column({ nullable: true })
	range: string;

	@Column("simple-json", { nullable: true })
	json: any;

	@Column({ nullable: true })
	tui: string;

	@Column("simple-json", { nullable: true })
	ace: any;

	@Column({ nullable: true })
	datetime: string;

	@Column({ nullable: true })
	date: string;

	@Column({ nullable: true })
	time: string;

	@Column({ nullable: true })
	number: number;

	@Column({ nullable: true })
	color: string;

	@Column({ nullable: true })
	week: string;

	@Column("simple-json", { nullable: true })
	schedule: any;

	@OneToMany(() => Example, (example) => example.owner)
	examples: Example[];

	@Column({ nullable: true })
	select: string;

	@Column("simple-json", { nullable: true })
	geojson: any;

	@Column({ nullable: true })
	guardedField: string;

	@ManyToOne(() => Test, { nullable: true })
	testRelation: Test;

	@ManyToOne(() => User, { nullable: true })
	owner: User;
}
