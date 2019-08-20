import xml2js from 'xml2js';
import DB from "./DB";

interface IPodcastSuiteConfig {
    proxy?: IProxy;
    podcasts?: Array<URL>;
    fresh?: Number;
}

interface IProxy {
    "https:": string,
    "http:": string,
}

interface IPodcast {
    title?: string;
    description?: string;
    url?: string;
    image?: string;
    items?: any[];
    created: number;
}

interface IRSS {
    rss: {
        [key: string]: any
    }
}

const PROXY: IProxy = {
	'https:': '/rss-pg/',
	'http:': '/rss-less-pg/'
};

const REQCONFIG = {
    method: 'GET',
    headers: {
    'User-Agent': 'podcastsuite',
    'Accept': 'application/rss+xml'
    },
}

const FRESH = 600000;

class PodcastSuite {

    /*
     parseEngine: Parser Engine use to convert Response String into RSS Outouts 
    */
    public static parserEngine = new xml2js.Parser({
        trim: false,
        normalize: true,
        mergeAttrs: true
    });

    /*
    Receives a URL and IProxy? object and return a URL String prefixed with the proxy path.
    @param url: URL object of the Podcast RSS URL
    @param porxy: IProxy object that contain urls that need to be prefixed to any URL.
    @return string url.
    */
    public static proxyURL(url: URL, proxy: IProxy): string{
        const { protocol, hostname, pathname, search, hash } = url;
        return `${proxy[protocol]}${hostname}${pathname}${search}${hash}`;
    }

    /*
    Recieves String with "RSS" content it returns a promise
    with either a an error if it couldn't be parsed or
    a RSS JSON Object.
    @param content: string, string to be parsed.
    @return Promise with Error Object or JSON Object.
    */
    public static parser(content: string): Promise<IRSS> {
        return new Promise((accept, reject) => {
            try {
                PodcastSuite.parserEngine.parseString(content, (err, result) => {
                    if (err) {
                        reject({ error: true });
                    }
                    accept(result);
                });
            } catch (error) {
                reject(error)
            }
        });
    }

    /*
    fetch function that request RSS URL and Parse it into an object.
    @param fetch:URL object with the RSS path.
    @param config?: { proxy: IPRoxy, signal }
    @return Object Error Object or Parsed RSS Object
    */
    public static fetch(url: URL, config?: { proxy?: IProxy, signal? }): Promise<IPodcast>{
        const { proxy, signal } = config;
        const podcastURL = proxy ? PodcastSuite.proxyURL(url, proxy ) : url;
        return new Promise( (accept, reject) => {
            fetch( podcastURL.toString(), { signal, ...REQCONFIG })
            .then( rawresponse => {
                if(!rawresponse.ok){
                    throw "Error Message";
                }
                return rawresponse.text();
            })
            .then(PodcastSuite.parser)
            .then((rss:IRSS) => Promise.resolve(PodcastSuite.format(rss)))
            .then(accept)
            .catch(reject)
        })
    }

    /*
    Convert IRSS Object into IPodcast Object
    @param json: IRSS obect to be converted into IPodcast Ojbect
    @return IPodcast Object
    */
    public static format(json: IRSS): IPodcast{
        const channel = Array.isArray(json.rss.channel) ?
                        json.rss.channel[0] : 
                        json.rss.channel;
        const rss: IPodcast = { items: [] };

        if (channel.title) {
            rss.title = channel.title[0];
        }

        if (channel.description) {
            rss.description = channel.description[0];
        }
        if (channel.link) {
            rss.url = channel.link[0];
        }
    
        if (channel.image) {
            rss.image = channel.image[0].url
        }
    
        if (!rss.image && channel["itunes:image"]) {
            rss.image = channel['itunes:image'][0].href
        }
        rss.image =  Array.isArray(rss.image) && rss.image[0] || rss.image;
                
        if (channel.item) {
            if (!Array.isArray(channel.item)) {
                channel.item = [channel.item];
            }
            channel.item.forEach(function (val) {
                const obj: {[key:string]: any} = {};
                obj.title = (val.title) ? val.title[0] : '';
                obj.description = (val.description) ? val.description[0] : '';
                obj.url = obj.link = (val.link) ? val.link[0] : '';
                obj.guid = val.guid && val.guid[0] && (val.guid[0]['_'] || val.guid[0]);
    
                if (val['itunes:subtitle']) {
                    obj.itunes_subtitle = val['itunes:subtitle'][0];
                }
                if (val['itunes:summary']) {
                    obj.itunes_summary = val['itunes:summary'][0];
                }
                if (val['itunes:author']) {
                    obj.itunes_author = val['itunes:author'][0];
                }
                if (val['itunes:explicit']) {
                    obj.itunes_explicit = val['itunes:explicit'][0];
                }
                if (val['itunes:duration']) {
                    obj.itunes_duration = val['itunes:duration'][0];
                }
                if (val['itunes:season']) {
                    obj.itunes_season = val['itunes:season'][0];
                }
                if (val['itunes:episode']) {
                    obj.itunes_episode = val['itunes:episode'][0];
                }
                if (val['itunes:episodeType']) {
                    obj.itunes_episodeType = val['itunes:episodeType'][0];
                }
                if (val.pubDate) {
                    obj.created = Date.parse(val.pubDate[0]);
                }
                if (val['media:content']) {
                    obj.media = val.media || {};
                    obj.media.content = val['media:content'];
                }
                if (val['media:thumbnail']) {
                    obj.media = val.media || {};
                    obj.media.thumbnail = val['media:thumbnail'];
                }
    
                if (val.enclosure) {
                    obj.enclosures = [];
                    if (!Array.isArray(val.enclosure))
                        val.enclosure = [val.enclosure];
                    val.enclosure.forEach(function (enclosure) {
                        var enc = {};
                        for (const x in enclosure) {
                            enc[x] = enclosure[x][0];
                        }
                        obj.enclosures.push(enc);
                    });
    
                }
                rss.items.push(obj);
    
            });
        }
        rss.created = Date.now();
        return rss;
    }

    /*
    Get Podcast Data from DB, if it doesn't exist it will fetch it.
    @param key: string with url
    @param? latest: if true forces to ignore memory and get the latest version available.
    @return IPodcast Object
    @throw Invalid URL
    */
    public getPodcast(key:string, latest = false){
        try {
            const podcast = new URL(key);
            return latest ? 
                this.refreshURL(podcast): 
                this.requestURL(podcast);
        }catch(e){
            throw "Not a Valid URL";
        }
    }

    /*
    Get All Keys from Existing DB/Library
    @return promise with all keys in library
    */
    public async getLibrary(){
        return await PodcastSuite.db.keys();
    }

    /*
    Get All Keys from Existing DB/Library
    @fn function recevies value of key and modifies it.
    @return Promise with an array of all values modified by callback
    */
    public async mapLibrary(fn:(value:any)=>any){
        const keys = await PodcastSuite.db.keys();
        return Promise.all(keys.map(fn));
    }

    /*
    Request URL if it exist in Memory it returns it, otherwise it fetch it and returns it.
    @param fetch:URL object with the RSS path.
    @return Promise<IPodcast>.
    */
    private async requestURL(podcastURL:URL, fresh = this.fresh): Promise<IPodcast> {
        const podcastFromMemory: IPodcast = await PodcastSuite.db.get(podcastURL.toJSON())
        if(podcastFromMemory && ( Date.now() - podcastFromMemory.created < fresh ) ) {
            return podcastFromMemory;
        }
        return this.refreshURL(podcastURL);
    }
    
    /*
    Request URL if it exist in Memory it executes FN with response, 
    after if there is an update executes the same FN with the new response.
    @param fetch:URL object with the RSS path.
    @return null.
    */
    private async requestURLFn(podcastURL:URL, fn:(data:IPodcast) => any){
        const podcastFromMemory: IPodcast = await PodcastSuite.db.get(podcastURL.toJSON())
        if(podcastFromMemory) {
            fn(podcastFromMemory);
        }
        const podcastFromWeb: IPodcast = await this.refreshURL(podcastURL);
        if( podcastFromWeb.items[0] !== podcastFromMemory.items[0] ){
            await PodcastSuite.db.set(podcastURL.toJSON(), podcastFromWeb);
            fn(podcastFromWeb);
        }
    }

    /*
    Request URL And force refresh
    @param fetch:URL object with the RSS path.
    @return Promise<IPodcast>.
    */
    private async refreshURL(podcastURL:URL): Promise<IPodcast> {
        const podcastFromWeb: IPodcast = await PodcastSuite.fetch(podcastURL, { proxy:this.proxy });
        await PodcastSuite.db.set(podcastURL.toJSON(), podcastFromWeb);
        return podcastFromWeb;
    }

    private async init(iKeys:URL[]){
        const dbKeys = await PodcastSuite.db.keys();
        const keys = Array.from(new Set( [...iKeys, ...dbKeys] ));
        keys.forEach( podcast => this.requestURLFn( new URL(podcast.toString()), ()=>null ));
    }

    private static db = DB;
    private library: Set<URL>;
    private proxy: IProxy;
    private fresh: Number;

    constructor( config: IPodcastSuiteConfig = {} ) {
        const { podcasts = [], proxy = PROXY, fresh = FRESH } = config;
        this.proxy = proxy;
        this.fresh = fresh;
        this.init(podcasts);
    }

};

export default PodcastSuite;
