import { IRSS, IPodcast } from "./PodcastSuite";

export interface IEpisode {
  title: string;
  description: string;
  url: string;
  link: string;
  guid: string;
  media?: {
    length: string;
    type: string;
    url: string;
  } | string,
  extra?: {
    content?: string;
    thumbnail?: string;
  }
  image?: string;
  created?: number;
  subtitle?: string;
  summary?: string;
  author?: string;
  explicit?: string;
  season?: string;
  duration?: number;
  episode?: string;
  episodeType?: string;
  enclosures?: string[];
}


 buildAtomFeed(xmlObj) {
    let feed = {items: []};
    utils.copyFromXML(xmlObj.feed, feed, this.options.customFields.feed);
    if (xmlObj.feed.link) {
      feed.link = utils.getLink(xmlObj.feed.link, 'alternate', 0);
      feed.feedUrl = utils.getLink(xmlObj.feed.link, 'self', 1);
    }
    if (xmlObj.feed.title) {
      let title = xmlObj.feed.title[0] || '';
      if (title._) title = title._
      if (title) feed.title = title;
    }
    if (xmlObj.feed.updated) {
      feed.lastBuildDate = xmlObj.feed.updated[0];
    }
    feed.items = (xmlObj.feed.entry || []).map(entry => this.parseItemAtom(entry));
    return feed;
  }

  parseItemAtom(entry) {
    let item = {};
    utils.copyFromXML(entry, item, this.options.customFields.item);
    if (entry.title) {
      let title = entry.title[0] || '';
      if (title._) title = title._;
      if (title) item.title = title;
    }
    if (entry.link && entry.link.length) {
      item.link = utils.getLink(entry.link, 'alternate', 0);
    }
    if (entry.published && entry.published.length && entry.published[0].length) item.pubDate = new Date(entry.published[0]).toISOString();
    if (!item.pubDate && entry.updated && entry.updated.length && entry.updated[0].length) item.pubDate = new Date(entry.updated[0]).toISOString();
    if (entry.author && entry.author.length && entry.author[0].name && entry.author[0].name.length) item.author = entry.author[0].name[0];
    if (entry.content && entry.content.length) {
      item.content = utils.getContent(entry.content[0]);
      item.contentSnippet = utils.getSnippet(item.content)
    }
    if (entry.summary && entry.summary.length) {
      item.summary = utils.getContent(entry.summary[0]);
    }
    if (entry.id) {
      item.id = entry.id[0];
    }
    this.setISODate(item);
    return item;
  }

  buildRSS0_9(xmlObj) {
    var channel = xmlObj.rss.channel[0];
    var items = channel.item;
    return this.buildRSS(channel, items);
  }

  buildRSS1(xmlObj) {
    xmlObj = xmlObj['rdf:RDF'];
    let channel = xmlObj.channel[0];
    let items = xmlObj.item;
    return this.buildRSS(channel, items);
  }

  buildRSS2(xmlObj) {
    let channel = xmlObj.rss.channel[0];
    let items = channel.item;
    let feed = this.buildRSS(channel, items);
    if (xmlObj.rss.$ && xmlObj.rss.$['xmlns:itunes']) {
      this.decorateItunes(feed, channel);
    }
    return feed;
  }

  buildRSS(channel, items) {
    items = items || [];
    let feed = {items: []};
    let feedFields = fields.feed.concat(this.options.customFields.feed);
    let itemFields = fields.item.concat(this.options.customFields.item);
    if (channel['atom:link'] && channel['atom:link'][0] && channel['atom:link'][0].$) {
      feed.feedUrl = channel['atom:link'][0].$.href;
    }
    if (channel.image && channel.image[0] && channel.image[0].url) {
      feed.image = {};
      let image = channel.image[0];
      if (image.link) feed.image.link = image.link[0];
      if (image.url) feed.image.url = image.url[0];
      if (image.title) feed.image.title = image.title[0];
      if (image.width) feed.image.width = image.width[0];
      if (image.height) feed.image.height = image.height[0];
    }
    const paginationLinks = this.generatePaginationLinks(channel);
    if (Object.keys(paginationLinks).length) {
      feed.paginationLinks = paginationLinks;
    }
    utils.copyFromXML(channel, feed, feedFields);
    feed.items = items.map(xmlItem => this.parseItemRss(xmlItem, itemFields));
    return feed;
  }

  parseItemRss(xmlItem, itemFields) {
    let item = {};
    utils.copyFromXML(xmlItem, item, itemFields);
    if (xmlItem.enclosure) {
      item.enclosure = xmlItem.enclosure[0].$;
    }
    if (xmlItem.description) {
      item.content = utils.getContent(xmlItem.description[0]);
      item.contentSnippet = utils.getSnippet(item.content);
    }
    if (xmlItem.guid) {
      item.guid = xmlItem.guid[0];
      if (item.guid._) item.guid = item.guid._;
    }
    if (xmlItem.category) item.categories = xmlItem.category;
    this.setISODate(item);
    return item;
  }

  /**
   * Add iTunes specific fields from XML to extracted JSON
   *
   * @access public
   * @param {object} feed extracted
   * @param {object} channel parsed XML
   */
  decorateItunes(feed, channel) {
    let items = channel.item || [];
    let categories = [];
    feed.itunes = {}

    if (channel['itunes:owner']) {
      let owner = {};

      if(channel['itunes:owner'][0]['itunes:name']) {
        owner.name = channel['itunes:owner'][0]['itunes:name'][0];
      }
      if(channel['itunes:owner'][0]['itunes:email']) {
        owner.email = channel['itunes:owner'][0]['itunes:email'][0];
      }
      feed.itunes.owner = owner;
    }

    if (channel['itunes:image']) {
      let image;
      let hasImageHref = (channel['itunes:image'][0] &&
        channel['itunes:image'][0].$ &&
        channel['itunes:image'][0].$.href);
      image = hasImageHref ? channel['itunes:image'][0].$.href : null;
      if (image) {
        feed.itunes.image = image;
      }
    }

    if (channel['itunes:category']) {
      const categoriesWithSubs = channel['itunes:category'].map((category) => {
        return {
          name: category && category.$ && category.$.text,
          subs: category['itunes:category'] ?
            category['itunes:category']
              .map((subcategory) => ({
                name: subcategory && subcategory.$ && subcategory.$.text
              })) : null,
        };
      });

      feed.itunes.categories = categoriesWithSubs.map((category) => category.name);
      feed.itunes.categoriesWithSubs = categoriesWithSubs;
    }

    if (channel['itunes:keywords']) {
      if (channel['itunes:keywords'].length > 1) {
        feed.itunes.keywords = channel['itunes:keywords'].map(
          keyword => keyword && keyword.$ && keyword.$.text
        );
      } else {
        let keywords = channel['itunes:keywords'][0];
        if (keywords && typeof keywords._ === 'string') {
          keywords = keywords._;
        }

        if (keywords && keywords.$ && keywords.$.text) {
          feed.itunes.keywords = keywords.$.text.split(',')
        } else if (typeof keywords === "string") {
          feed.itunes.keywords = keywords.split(',');
        }
      }
    }


export default function format(
  result: IRSS,
  init: { length?: number; url?: string; etag?: number } = {
    length: Date.now(),
  }
): IPodcast {

  let feed = null;
        if (result.feed) {
          feed = this.buildAtomFeed(result);
        } else if (result.rss && result.rss.$ && result.rss.$.version && result.rss.$.version.match(/^2/)) {
          feed = this.buildRSS2(result);
        } else if (result['rdf:RDF']) {
          feed = this.buildRSS1(result);
        } else if (result.rss && result.rss.$ && result.rss.$.version && result.rss.$.version.match(/0\.9/)) {
          feed = this.buildRSS0_9(result);
        } else if (result.rss && this.options.defaultRSS) {
          switch(this.options.defaultRSS) {
            case 0.9:
              feed = this.buildRSS0_9(result);
              break;
            case 1:
              feed = this.buildRSS1(result);
              break;
            case 2:
              feed = this.buildRSS2(result);
              break;
            default:
              new Error("default RSS version not recognized.");
        }



  // const channel = Array.isArray(json.rss.channel)
  //   ? json.rss.channel[0]
  //   : json.rss.channel;
  // const rss: any = Object.assign(init, { items: [], created: Date.now() });

  // if (channel.image) {
  //   rss.image = channel.image[0].url;
  // }

  // if (!rss.image && channel["itunes:image"]) {
  //   rss.image = channel["itunes:image"][0].href;
  // }

  // [
  //   "title",
  //   "description",
  //   "link",
  //   "itunes:author",
  //   "itunes:category",
  //   "itunes:explicit",
  //   "itunes:summary",
  //   "copyright",
  //   "language",
  // ].forEach((key) => {
  //   if (channel[key] !== undefined) {
  //     const [prefix, keyname] = key.split(":");
  //     if (keyname) {
  //       rss[keyname] = channel[key] && channel[key][0];
  //     } else {
  //       rss[prefix] = channel[key] && channel[key][0];
  //     }
  //   }
  // });

  // rss.image = (Array.isArray(rss.image) && rss.image[0]) || rss.image;

  // if (channel.item) {
  //   if (!Array.isArray(channel.item)) {
  //     channel.item = [channel.item];
  //   }
  //   channel.item.forEach(function (val) {
  //     const title = val.title ? val.title[0] : "";
  //     const description = val.description ? val.description[0] : "";
  //     const url = val.link ? val.link[0] : "";
  //     const guid = val.guid && val.guid[0] && (val.guid[0]["_"] || val.guid[0]);

  //     const obj: IEpisode = {
  //       title,
  //       description,
  //       url,
  //       guid,
  //       link: url,
  //       media: ''
  //     };

  //     [
  //       "itunes:subtitle",
  //       "itunes:summary",
  //       "itunes:author",
  //       "itunes:explicit",
  //       "itunes:duration",
  //       "itunes:season",
  //       "itunes:episode",
  //       "itunes:episodeType",
  //     ].forEach((key) => {
  //       if (channel[key] !== undefined) {
  //         const [prefix, keyname] = key.split(":");
  //         if (keyname) {
  //           obj[keyname] = val[key] && val[key][0];
  //         } else {
  //           obj[prefix] = val[key] && val[key][0];
  //         }
  //       }
  //     });

  //     if (val["itunes:image"]) {
  //       const hasImageHref =
  //         val["itunes:image"][0] &&
  //         val["itunes:image"][0] &&
  //         val["itunes:image"][0].href;
  //       const image = hasImageHref ? val["itunes:image"][0].href : null;
  //       obj.image = image;
  //     }
  //     if (val.pubDate) {
  //       obj.created = Date.parse(val.pubDate[0]);
  //     }
  //     if (val["media:content"]) {
  //       obj.extra.content = val["media:content"];
  //     }
  //     if (val["media:thumbnail"]) {
  //       obj.extra.thumbnail = val["media:thumbnail"];
  //     }

  //     if (val.enclosure) {
  //       const enclosures = [];
  //       if (!Array.isArray(val.enclosure)) val.enclosure = [val.enclosure];
  //       val.enclosure.forEach(function (enclosure) {
  //         var enc = {};
  //         for (const x in enclosure) {
  //           enc[x] = enclosure[x][0];
  //         }
  //         enclosures.push(enc);
  //       });
  //       obj.enclosures = enclosures;
  //       obj.media = enclosures.length > 0 ? enclosures[0] : null;
  //     }
  //     rss.items.push(obj);
  //   });
  // }

  // return { ...rss, ...init };
}
