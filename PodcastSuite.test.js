require("fake-indexeddb/auto");

const nodeFetch = jest.requireActual('node-fetch');
const fetchMock = require('fetch-mock').sandbox();
Object.assign(fetchMock.config, nodeFetch, {
  fetch: nodeFetch
});

const PS = require("./dist/index.umd.js");
const fetch = require("node-fetch");
const sample = require("./mock/sample");

describe("Podcast Suite", () => {

    it("should initialize a Library", async () => {
        const ps = new PS({fetchEngine: fetch});
        expect(ps).toBeInstanceOf(PS);
    });

    it("should have static elements", async () => {
        expect(PS).toHaveProperty("fetchContent");
        expect(PS).toHaveProperty("fetchSize");
        expect(PS).toHaveProperty("fetch");
        expect(PS).toHaveProperty("parser");
        expect(PS).toHaveProperty("proxyURL");
    });

    it("can get fetchContent and return it as a Blob", async () => {
        const toTest = "https://tests.com/test";
        fetchMock.get(toTest, {});
        const value = await PS.fetchContent(new URL(toTest), { fetchEngine: fetchMock });
        expect(value.constructor.name === 'Blob').toBe(true);
    });

    it("can parse RSS:XML content into Podcast Object ", async () => {
        const RSS = await PS.parser(sample);
        const podcast = PS.format(RSS);
        expect(podcast.title).toBe("Up First");
        expect(podcast.items.length).toBe(2);
    });

    it("can get fetch and return a podcast object", async () => {
        const toTest = "https://tests.com/rss";
        fetchMock.get(toTest, sample);
        const podcast = await PS.fetch(new URL(toTest), { fetchEngine: fetchMock });
        expect(podcast.title).toBe("Up First");
    });
});