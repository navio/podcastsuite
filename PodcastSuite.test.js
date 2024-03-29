'use strict';

require("fake-indexeddb/auto");
var nodeFetch = jest.requireActual('node-fetch');
var fs = require("fs");
var fetchMock = require('fetch-mock').sandbox();
Object.assign(fetchMock.config, nodeFetch, {
  fetch: nodeFetch
});

var PS = require("./dist/index.js");
var fetch = require("node-fetch");
var sample = require("./mock/sample");
var rawRSS = fs.readFileSync( './mock/podcast.rss', 'utf8' )
var rawComplicated = fs.readFileSync( './mock/Complicated.rss', 'utf8' )

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

    it("should notify when library is ready", async() => {
        const toTest = "https://tests.com/initlibrary";
        fetchMock.get(toTest, sample);
        const ps = new PS({ podcasts: [toTest], fetchEngine: fetchMock });
        const isReady = await ps.ready;
        expect(isReady).toBe(true);
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
        expect(podcast.description.length).toBe(362);
        const episode = podcast.items[0];
        expect(episode.title).toBe("Tuesday, September 10th, 2019");
        expect(episode.description.length).toBe(648);
        expect(episode.media.url.length).toBe(252);
        expect(episode.image.length).toBe(120)
    });

    it("can get fetch and return a podcast object", async () => {
        const toTest = "https://tests.com/rss";
        fetchMock.get(toTest, sample);
        const podcast = await PS.fetch(new URL(toTest), { fetchEngine: fetchMock });
        expect(podcast.title).toBe("Up First");
        expect(fetchMock.calls(toTest).length).toBe(1);
    });

    it("getPodcast should fetch first, then from memory later", async () => {
        const toTest = "https://tests.com/instance/rss";
        fetchMock.get(toTest, sample);
        const ps = new PS({fetchEngine: fetchMock});
        await ps.getPodcast(new URL(toTest), {save: false});
        const podcast = await ps.getPodcast(new URL(toTest));
        expect(podcast.title).toBe("Up First");
        const podcast1 = await ps.getPodcast(new URL(toTest));
        expect(podcast1.title).toBe("Up First");
        expect(fetchMock.calls(toTest).length).toBe(2);
    });


    it("can get the size of the content", async () => {
        const toTest = "https://tests.com/head";
        const size = 8000;
        fetchMock.head(toTest, { headers: {"content-length": size }});
        const sizeL = await PS.fetchSize(new URL(toTest), { fetchEngine: fetchMock });
        expect(sizeL === size ).toBe(true)
    });

    it("create a DB", async () => {
        const name = 'TEST';
        const value = 'response'
        const db = PS.createDatabase('TableName', 'AnotheDatabse');
        expect(db).toHaveProperty('get');
        expect(db).toHaveProperty('set');
        expect(db).toHaveProperty('del');
        await db.set(name,value);
        const result =  await db.get(name);
        expect(result).toBe(value)
    });

    it("parses a RawFile and format it correctly", async() => {
       const data =  await PS.parser(rawRSS);
       const podcast = PS.format(data);
       expect(podcast.title).toBe("Leyendas Legendarias");
       expect(podcast.description.length).toBe(169);
       expect(podcast.items.length).toBe(174);
       const episode = podcast.items[0];
       expect(episode.title).toBe('BONUS: Lucha Libre Legendaria x Nike');
       expect(episode.description.length).toBe(442);
       expect(episode.media.url.length).toBe(240);
       expect(episode.image.length).toBe(180)
    });

    it("parses a RawFile and format it from a Complicated", async() => {
        const data =  await PS.parser(rawComplicated);
        const podcast = PS.format(data);
        expect(podcast.title).toBe("Business Wars");
        const episode = podcast.items[0];
        expect(episode.title).toBe('Introducing: Harsh Reality - The Story of Miriam Rivera');
        expect(episode.episodeType).toBe("trailer");
     });

});
