'use strict';

require("fake-indexeddb/auto");
var nodeFetch = jest.requireActual('node-fetch');
var fetchMock = require('fetch-mock').sandbox();
Object.assign(fetchMock.config, nodeFetch, {
  fetch: nodeFetch
});

var PS = require("./dist/index.umd.js");
var fetch = require("node-fetch");
var sample = require("./mock/sample");

// afterEach(fetchMock.reset);

describe("Podcast Suite", () => {

    it("should initialize a Library", async () => {
        const ps = new PS({fetchEngine: fetch});
        expect(ps).toBeInstanceOf(PS);
        expect(ps).toHaveProperty("mapLibrary");
        expect(ps).toHaveProperty("getPodcast");
        expect(ps).toHaveProperty("getLibrary");
        expect(ps).toHaveProperty("getContent");
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
        expect(fetchMock.calls(toTest).length).toBe(1);
    });

    it("should fetch first, then from memory later", async () => {
        const toTest = "https://tests.com/instance/rss";
        fetchMock.get(toTest, sample);
        const ps = new PS({fetchEngine: fetchMock});
        const podcast = await ps.getPodcast(new URL(toTest));
        expect(podcast.title).toBe("Up First");
        const podcast1 = await ps.getPodcast(new URL(toTest));
        expect(podcast1.title).toBe("Up First");
        expect(fetchMock.calls(toTest).length).toBe(1);
    });

    it("can get the size of the content", async () => {
        const toTest = "https://tests.com/head";
        const size = 8000;
        fetchMock.head(toTest, { headers: {"content-length": size }});
        const sizeL = await PS.fetchSize(new URL(toTest), { fetchEngine: fetchMock });
        expect(sizeL === size ).toBe(true)
    });
});