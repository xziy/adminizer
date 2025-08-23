import { AbstractCatalog } from "./AbstractCatalog";

export class CatalogHandler {
	private catalog: AbstractCatalog[] = [];

    public add(catalog: AbstractCatalog) {
		this.catalog.push(catalog)
		return catalog
	}

	public getAll() {
		return this.catalog;
	}

	public getCatalog(slug: string) {
		return this.catalog.find((catalog) => catalog.slug === slug)
	}
}
