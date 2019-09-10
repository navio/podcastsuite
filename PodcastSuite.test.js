require("fake-indexeddb/auto");
const fetchMock = require('fetch-mock');
const PS = require("./dist/index.umd.js");
const fetch = require("node-fetch");

// afterEach(fakeFetch.restore);

describe("Podcast Suite should", () => {

    it("initialize a Library", async () => {
        const ps = new PS({fetchEngine: fetch});
        expect(ps).toBeInstanceOf(PS);
    });

    it("have static elements", async () => {
        expect(PS).toHaveProperty("fetchContent");
        expect(PS).toHaveProperty("fetchSize");
        expect(PS).toHaveProperty("fetch");
        expect(PS).toHaveProperty("parser");
        expect(PS).toHaveProperty("proxyURL");
    });

    it("can get content as Blobs", async () => {
        const toTest = "https://tests.com/test";
        fetchMock.get(toTest , {});
        const value = await PS.fetchContent(new URL(toTest), { fetchEngine: fetch });
        expect(value.constructor.name === 'Blob').toBe(true);
    });

});