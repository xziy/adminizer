import { create } from "xmlbuilder2";

export type FeedItem = {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  updated?: Date;
  published?: Date;
  link?: string;
};

export type FeedOptions = {
  title: string;
  subtitle?: string;
  link: string;
  updated: Date;
  items: FeedItem[];
  authorName?: string;
};

/**
 * Generates Atom and RSS feeds from filter results.
 */
export class FeedGenerator {
  /**
   * Builds an Atom 1.0 feed XML string.
   */
  public generateAtom(options: FeedOptions): string {
    const doc = create({ version: "1.0", encoding: "UTF-8" })
      .ele("feed", { xmlns: "http://www.w3.org/2005/Atom" });

    doc.ele("title").txt(options.title).up();
    if (options.subtitle) {
      doc.ele("subtitle").txt(options.subtitle).up();
    }
    doc.ele("link", { href: options.link }).up();
    doc.ele("updated").txt(options.updated.toISOString()).up();
    doc.ele("id").txt(options.link).up();

    if (options.authorName) {
      const author = doc.ele("author");
      author.ele("name").txt(options.authorName).up();
      author.up();
    }

    options.items.forEach((item) => {
      const entry = doc.ele("entry");
      entry.ele("id").txt(item.id).up();
      entry.ele("title").txt(item.title).up();
      if (item.link) {
        entry.ele("link", { href: item.link }).up();
      }
      if (item.updated) {
        entry.ele("updated").txt(item.updated.toISOString()).up();
      } else {
        entry.ele("updated").txt(options.updated.toISOString()).up();
      }
      if (item.summary) {
        entry.ele("summary").txt(item.summary).up();
      }
      if (item.content) {
        entry.ele("content", { type: "html" }).txt(item.content).up();
      }
      entry.up();
    });

    return doc.end({ prettyPrint: true });
  }

  /**
   * Builds an RSS 2.0 feed XML string.
   */
  public generateRss(options: FeedOptions): string {
    const doc = create({ version: "1.0", encoding: "UTF-8" })
      .ele("rss", { version: "2.0" });

    const channel = doc.ele("channel");
    channel.ele("title").txt(options.title).up();
    channel.ele("link").txt(options.link).up();
    channel.ele("description").txt(options.subtitle ?? options.title).up();
    channel.ele("lastBuildDate").txt(options.updated.toUTCString()).up();

    options.items.forEach((item) => {
      const entry = channel.ele("item");
      entry.ele("guid").txt(item.id).up();
      entry.ele("title").txt(item.title).up();
      if (item.link) {
        entry.ele("link").txt(item.link).up();
      }
      if (item.published) {
        entry.ele("pubDate").txt(item.published.toUTCString()).up();
      } else if (item.updated) {
        entry.ele("pubDate").txt(item.updated.toUTCString()).up();
      }
      if (item.summary) {
        entry.ele("description").txt(item.summary).up();
      } else if (item.content) {
        entry.ele("description").txt(item.content).up();
      }
      entry.up();
    });

    return doc.end({ prettyPrint: true });
  }
}
