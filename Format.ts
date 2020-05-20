import { IRSS, IPodcast } from "./PodcastSuite";

export default function format(
  json: IRSS,
  init: { length?: number; url?: string } = { length: Date.now() }
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

  [ "title",
    "description",
    "link",
    "itunes:author",
    "itunes:category",
    "itunes:explicit",
    "itunes:summary",
    "copyright",
    "language",
  ].forEach((key) => {
    if (channel[key]) {
      const [prefix, keyname] = key.split(":");
      if (keyname) {
        rss[keyname] = channel[key][0];
      } else {
        rss[prefix] = channel[key][0];
      }
    }
  });

  rss.image = (Array.isArray(rss.image) && rss.image[0]) || rss.image;

  if (channel.item) {
    if (!Array.isArray(channel.item)) {
      channel.item = [channel.item];
    }
    channel.item.forEach(function (val) {
      const obj: { [key: string]: any } = {};
      obj.title = val.title ? val.title[0] : "";
      obj.description = val.description ? val.description[0] : "";
      obj.url = obj.link = val.link ? val.link[0] : "";
      obj.guid = val.guid && val.guid[0] && (val.guid[0]["_"] || val.guid[0]);

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
        if (channel[key]) {
          const [prefix, keyname] = key.split(":");
          if (keyname) {
            obj[keyname] = val[key][0];
          } else {
            obj[prefix] = val[key][0];
          }
        }
      });

      if (val["itunes:image"]) {
        const hasImageHref =
          val["itunes:image"][0] &&
          val["itunes:image"][0].$ &&
          val["itunes:image"][0].$.href;
        const image = hasImageHref ? val["itunes:image"][0].$.href : null;
        obj.image = image;
      }
      if (val.pubDate) {
        obj.created = Date.parse(val.pubDate[0]);
      }
      if (val["media:content"]) {
        obj.media = val.media || {};
        obj.media.content = val["media:content"];
      }
      if (val["media:thumbnail"]) {
        obj.media = val.media || {};
        obj.media.thumbnail = val["media:thumbnail"];
      }

      if (val.enclosure) {
        obj.enclosures = [];
        if (!Array.isArray(val.enclosure)) val.enclosure = [val.enclosure];
        val.enclosure.forEach(function (enclosure) {
          var enc = {};
          for (const x in enclosure) {
            enc[x] = enclosure[x][0];
          }
          obj.enclosures.push(enc);
        });
        obj.media = obj.enclosures.length > 0 ? obj.enclosures[0] : null;
      }
      rss.items.push(obj);
    });
  }

  return { ...rss, ...init };
}
