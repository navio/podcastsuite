import { IRSS, IPodcast } from "./PodcastSuite";

export default function format(json: IRSS, init:{ length?: number, url?:string } = { length: Date.now() } ): IPodcast {
    const { length, url } = init;
    const channel = Array.isArray(json.rss.channel) ?
                    json.rss.channel[0] : 
                    json.rss.channel;
    const rss: any = Object.assign(init, { items: [], created: Date.now() }); 
    
    if (channel.title) {
        rss.title = channel.title[0];
    }

    if (channel.description) {
        rss.description = channel.description[0];
    }
    if (channel.link) {
        rss.link = channel.link[0];
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
                obj.subtitle = val['itunes:subtitle'][0];
            }
            if (val['itunes:summary']) {
                obj.summary = val['itunes:summary'][0];
            }
            if (val['itunes:author']) {
                obj.author = val['itunes:author'][0];
            }
            if (val['itunes:explicit']) {
                obj.explicit = val['itunes:explicit'][0];
            }
            if (val['itunes:duration']) {
                obj.duration = val['itunes:duration'][0];
            }
            if (val['itunes:season']) {
                obj.season = val['itunes:season'][0];
            }
            if (val['itunes:episode']) {
                obj.episode = val['itunes:episode'][0];
            }
            if (val['itunes:episodeType']) {
                obj.episodeType = val['itunes:episodeType'][0];
            }
            if(val['itunes:image']) {
                const hasImageHref = (val['itunes:image'][0] &&
                                      val['itunes:image'][0].$ &&
                                      val['itunes:image'][0].$.href);
                const image = hasImageHref ? val['itunes:image'][0].$.href : null;
                obj.image = image; 
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
              obj.media = obj.enclosures.length > 0 ? obj.enclosures[0] : null;
            }
            rss.items.push(obj);
        });
    }
    
    return { ...rss, ...init }
}