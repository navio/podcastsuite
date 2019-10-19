import xml2js from 'xml2js';
import DB from "./DB";
import StreamReader from './StreamReader';
import Format from './Format';

export interface IPodcastSuiteConfig {
    proxy?: IProxy;
    podcasts?: string[];
    fresh?: number;
    fetchEngine?: Function;
}

export interface IProxy {
    "https:": string,
    "http:": string,
}

export interface IPodcast {
    title?: string;
    description?: string;
    url: string;
    link?: string;
    image?: string;
    items?: any[];
    created: number;
    length?: number;
}

export interface IRSS {
    rss: {
        [key: string]: any
    }
}

export const PROXY: IProxy = {
	'https:': '/rss-pg/',
	'http:': '/rss-less-pg/'
};

const REQCONFIG = {
    headers: {
    'User-Agent': 'podcastsuite',
    'Accept': 'application/rss+xml'
    },
}

const FRESH = 3600000;

class PodcastSuite {

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
                PodcastSuite.parserEngine(content, (err, result) => {
                    if (err) {
                        reject({ error: true, err });
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
    public static fetch(podcastURL: URL, config: { proxy?: IProxy, signal?, fetchEngine? } = {}): Promise<IPodcast>{
        const { proxy, signal, fetchEngine = fetch } = config;
        const podcastProxyURL = proxy ? PodcastSuite.proxyURL(podcastURL, proxy ) : podcastURL;
        const url = podcastURL.toString();
        let length = 0;
        return new Promise( (accept, reject) => {
            fetchEngine( podcastProxyURL.toString(), { signal, method: 'GET', ...REQCONFIG })
            .then( rawresponse => {
                
                if(!rawresponse.ok){
                    throw "Error Message";
                }
                length = Number(rawresponse.headers.get("content-length"));
                return rawresponse.text();
            })
            .then(PodcastSuite.parser)
            .then((rss:IRSS) => Promise.resolve(PodcastSuite.format(rss, { length, url })))
            .then(accept)
            .catch(reject)
        })
    }

    /*
    fetch function that request Content URL and Parse it into a Blob object
    @param fetch:URL object with the RSS path.
    @param config?: { proxy: IPRoxy, signal }
    @return Object Error Object or Blob Object
    */
    public static fetchContent(contentURL: URL, config: { proxy?: IProxy, signal?, progress?: () => any, fetchEngine? } = {}): any {
        const { proxy, signal, progress, fetchEngine = fetch } = config;
        const contentProxyURL: string  = proxy ? PodcastSuite.proxyURL(contentURL, proxy) : contentURL.toString();
        return fetchEngine(contentProxyURL, { method: 'GET', signal } )
        .then(StreamReader(progress))
        .then( (raw) => raw.blob());
    }
    
    /*
    fetch function that request RSS URL and get the size of the RSS.
    @param fetch:URL object with the RSS path.
    */
    public static async fetchSize(url: URL, config?: { proxy?: IProxy, signal?, fetchEngine? }){
      const { proxy, signal, fetchEngine = fetch  } = config;
      const podcastURL = proxy ? PodcastSuite.proxyURL(url, proxy ) : url;
      try{
        const response = await fetchEngine( podcastURL.toString(), { signal, method: 'HEAD', ...REQCONFIG })
        return Number(response.headers.get("content-length"));
      }catch(error){
        return null;
      }
    }

    /*
    Validate if a Podcast is Fresh
    @param podcast: IPodcast 
    @return Boleean
    */
    private static isFresh(podcast: IPodcast, config: { fresh?: number, length?: number }): boolean {
      if( config.fresh && ( Date.now() - podcast.created ) < config.fresh){
        return true;
      }
      if ( config.length && config.length === podcast.length ){
        return true;
      }
      return false;
    }
    

    /*
    parseEngine: Parser Engine use to convert Response String into RSS Outouts 
    */
    private static parserEngine = new xml2js.Parser({
        trim: false,
        normalize: true,
        mergeAttrs: true
    }).parseString;

    /*
    Convert IRSS Object into IPodcast Object
    @param json: IRSS obect to be converted into IPodcast Ojbect
    @return IPodcast Object
    */

    public static format = Format;

    /*
    Get Podcast Data from DB, if it doesn't exist it will fetch it.
    @param key: string with url
    @param? latest: if true forces to ignore memory and get the latest version available.
    @return IPodcast Object
    @throw Invalid URL
    */
    public async getPodcast(key: string, config: { latest?: boolean, save?: boolean } = {} ){
        const { latest = false , save = true }  = config;
        try {
            const podcast = new URL(key);
            return latest ? 
                this.refreshURL(podcast, save): 
                this.requestURL(podcast, { save });
        }catch(e){
            throw "Not a Valid URL";
        }
    }

    /*
    Get Content Data from DB, if it doesn't exist it will fetch it.
    @param key: string with url
    @param? refresh: if true forces to ignore memory and get the latest version available.
    @return Blob Object
    @throw Invalid URL
    */
    public async getContent(contentURL: URL, config: {refresh?: boolean} = {}) {
      const contentFromMemory = await PodcastSuite.db.get(contentURL.toJSON());
      const { refresh = false } = config;
      if(contentFromMemory && !refresh){
        return contentFromMemory;
      }
      try{
        
        const fetchedContent = 
        await PodcastSuite.fetchContent(contentURL, {proxy: this.proxy, fetchEngine: this.fetchEngine });
        await PodcastSuite.db.set(contentURL.toJSON(), fetchedContent);
        return fetchedContent;
        
      }catch(error){
        console.error(error);
        throw "Error Retriving Content";
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
    Request URL if it exist in Memory it executes FN with response, 
    after if there is an update executes the same FN with the new response.
    @param fetch:URL object with the RSS path.
    @return null.
    */
    private async requestURL(podcastURL:URL, config: { fn?:(data:IPodcast) => any, fresh?: number, save?: boolean } = {}){
        
        const podcastFromMemory: IPodcast | null = await PodcastSuite.db.get(podcastURL.toJSON());
        const { fn = null , fresh = this.fresh, save = true } = config;
        
        if(podcastFromMemory) {
            if(fn) {
              fn(podcastFromMemory);
            }
            
            if ( PodcastSuite.isFresh(podcastFromMemory, { fresh }) ){
              return podcastFromMemory;
            } else {
              const length = await PodcastSuite.fetchSize( podcastURL, { proxy: this.proxy, fetchEngine: this.fetchEngine } );
              if ( PodcastSuite.isFresh(podcastFromMemory, { length }) ){
                return podcastFromMemory;
              }
            }
        }

        const podcastFromWeb: IPodcast = await this.refreshURL(podcastURL, save);
                
        if(fn){
          fn(podcastFromWeb);
        }

        return podcastFromWeb;
    }

    /*
    Request URL And force refresh
    @param fetch:URL object with the RSS path.
    @return Promise<IPodcast>.
    */
    private async refreshURL(podcastURL:URL, save: boolean = true): Promise<IPodcast> {
        let podcastFromWeb: IPodcast;
        try{
            podcastFromWeb = await PodcastSuite.fetch(podcastURL, { proxy:this.proxy, fetchEngine: this.fetchEngine });
            if(save){
                await PodcastSuite.db.set(podcastURL.toJSON(), podcastFromWeb);
            }
        }catch(error){
            throw new Error(error);
        }
        return podcastFromWeb;
    }

    /*
    Initialize Library based on provided podcast URL.
    @param ikeys:string[]
    */
    private async init(iKeys:string[]){
        const dbKeys = await PodcastSuite.db.keys();
        const keys = Array.from(new Set( [...iKeys, ...dbKeys] ));
        const request = keys.map( (podcast) => this.requestURL( new URL(podcast.toString()), { fn: ()=>null, fresh: this.fresh } ));
        const completed = await Promise.all(request);
        return !!completed;
    }

    private static db = DB();
    private proxy: IProxy;
    private fresh: number;
    private fetchEngine: Function;
    public ready: Promise<Boolean>;

    constructor( config: IPodcastSuiteConfig = {} ) {
        const { podcasts = [], proxy, fresh = FRESH, fetchEngine = fetch } = config;
        this.proxy = proxy;
        this.fresh = fresh;
        this.ready = this.init(podcasts);
        this.fetchEngine = fetchEngine;
    }

};

export default PodcastSuite;