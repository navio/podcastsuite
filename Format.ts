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

export default function format(
  json: IRSS,
  init: { length?: number; url?: string; etag?: number } = {
    length: Date.now(),
  }
): IPodcast {
  const channel = Array.isArray(json.rss.channel)
    ? json.rss.channel[0]
    : json.rss.channel;
  const rss: any = Object.assign(init, { items: [], created: Date.now() });

  if (channel.image) {
    rss.image = channel.image[0].url;
  }

  if (!rss.image && channel["itunes:image"]) {
    rss.image = channel["itunes:image"][0].href;
  }

  [
    "title",
    "description",
    "link",
    "itunes:author",
    "itunes:category",
    "itunes:explicit",
    "itunes:summary",
    "copyright",
    "language",
  ].forEach((key) => {
    if (channel[key] !== undefined) {
      const [prefix, keyname] = key.split(":");
      if (keyname) {
        rss[keyname] = channel[key] && channel[key][0];
      } else {
        rss[prefix] = channel[key] && channel[key][0];
      }
    }
  });

  rss.image = (Array.isArray(rss.image) && rss.image[0]) || rss.image;

  if (channel.item) {
    if (!Array.isArray(channel.item)) {
      channel.item = [channel.item];
    }
    channel.item.forEach(function (val) {
      const title = val.title ? val.title[0] : "";
      const description = val.description ? val.description[0] : "";
      const url = val.link ? val.link[0] : "";
      const guid = val.guid && val.guid[0] && (val.guid[0]["_"] || val.guid[0]);

      const obj: IEpisode = {
        title,
        description,
        url,
        guid,
        link: url,
        media: ''
      };

      [
        "itunes:subtitle",
        "itunes:summary",
        "itunes:author",
        "itunes:explicit",
        "itunes:duration",
        "itunes:season",
        "itunes:episode",
        "itunes:episodeType",
      ].forEach((key) => {
        if (channel[key] !== undefined) {
          const [prefix, keyname] = key.split(":");
          if (keyname) {
            obj[keyname] = val[key] && val[key][0];
          } else {
            obj[prefix] = val[key] && val[key][0];
          }
        }
      });

      if (val["itunes:image"]) {
        const hasImageHref =
          val["itunes:image"][0] &&
          val["itunes:image"][0].href;
        const image = hasImageHref ? val["itunes:image"][0].href[0] : null;
        obj.image = image;
      }
      if (val.pubDate) {
        obj.created = Date.parse(val.pubDate[0]);
      }
      obj.extra = {};
      if (val["media:content"]) {
        obj.extra.content = val["media:content"];
      }
      if (val["media:thumbnail"]) {
        obj.extra.thumbnail = val["media:thumbnail"];
      }

      if (val.enclosure) {
        const enclosures = [];
        if (!Array.isArray(val.enclosure)) val.enclosure = [val.enclosure];
        val.enclosure.forEach(function (enclosure) {
          var enc = {};
          for (const x in enclosure) {
            enc[x] = enclosure[x][0];
          }
          enclosures.push(enc);
        });
        obj.enclosures = enclosures;
        obj.media = enclosures.length > 0 ? enclosures[0] : null;
      }
      rss.items.push(obj);
    });
  }

  return { ...rss, ...init };
}
