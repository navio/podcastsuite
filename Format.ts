import { IRSS, IPodcast } from "./PodcastSuite";

export interface IEpisode {
  title: string;
  description: string;
  url: string;
  link: string;
  guid: string;
  podcast: string;
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
  const link = init.url;
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
    "itunes:type",
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
    channel.item.forEach(function (episode) {
      const title = episode.title ? episode.title[0] : "";
      const description = episode.description ? episode.description[0] : "";
      const url = episode.link ? episode.link[0] : "";
      const guid = episode.guid && episode.guid[0] && (episode.guid[0]["_"] || episode.guid[0]);

      const iEpisode: IEpisode = {
        title,
        description,
        url,
        guid,
        podcast: init.url,
        link,
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
        if (episode[key] !== undefined) {
          const [prefix, keyname] = key.split(":");
          if (keyname) {
            iEpisode[keyname] = episode[key] && episode[key][0];
          } else {
            iEpisode[prefix] = episode[key] && episode[key][0];
          }
        }
      });

      if (episode["itunes:image"]) {
        const hasImageHref =
          episode["itunes:image"][0] &&
          episode["itunes:image"][0].href;
        const image = hasImageHref ? episode["itunes:image"][0].href[0] : null;
        iEpisode.image = image;
      }
      if (episode.pubDate) {
        iEpisode.created = Date.parse(episode.pubDate[0]);
      }
      iEpisode.extra = {};
      if (episode["media:content"]) {
        iEpisode.extra.content = episode["media:content"];
      }
      if (episode["media:thumbnail"]) {
        iEpisode.extra.thumbnail = episode["media:thumbnail"];
      }

      if (episode.enclosure) {
        const enclosures = [];
        if (!Array.isArray(episode.enclosure)) episode.enclosure = [episode.enclosure];
        episode.enclosure.forEach(function (enclosure) {
          var enc = {};
          for (const x in enclosure) {
            enc[x] = enclosure[x][0];
          }
          enclosures.push(enc);
        });
        iEpisode.enclosures = enclosures;
        iEpisode.media = enclosures.length > 0 ? enclosures[0] : null;
      }
      rss.items.push(iEpisode);
    });
  }

  return { ...rss, ...init };
}
