import { describe, it, expect } from "vitest";
import { FeedGenerator } from "../../src/lib/public-api/FeedGenerator";

describe("FeedGenerator", () => {
  it("generates an Atom feed with entries", () => {
    const generator = new FeedGenerator();
    const updated = new Date("2026-02-08T10:00:00.000Z");
    const atom = generator.generateAtom({
      title: "Test Feed",
      subtitle: "Sample",
      link: "https://example.com/feed",
      updated,
      items: [
        {
          id: "item-1",
          title: "First",
          summary: "Summary",
          content: "Content",
          updated,
          link: "https://example.com/items/1"
        }
      ],
      authorName: "Admin"
    });

    expect(atom).toContain("<feed");
    expect(atom).toContain("<title>Test Feed</title>");
    expect(atom).toContain("<entry>");
    expect(atom).toContain("<id>item-1</id>");
    expect(atom).toContain("First");
  });

  it("generates an RSS feed with items", () => {
    const generator = new FeedGenerator();
    const updated = new Date("2026-02-08T10:00:00.000Z");
    const rss = generator.generateRss({
      title: "Test RSS",
      subtitle: "Sample",
      link: "https://example.com/rss",
      updated,
      items: [
        {
          id: "item-2",
          title: "Second",
          summary: "Summary",
          published: updated,
          link: "https://example.com/items/2"
        }
      ]
    });

    expect(rss).toContain("<rss");
    expect(rss).toContain("<channel>");
    expect(rss).toContain("<title>Test RSS</title>");
    expect(rss).toContain("<guid>item-2</guid>");
    expect(rss).toContain("Second");
  });
});
