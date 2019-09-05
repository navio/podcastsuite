## Podcast Suite
Podcast Suite is JS Library focused on handling Podcast RSS Sources.
<a href="https://www.npmjs.org/package/smallfetch">
   <img src="https://badgen.net/npm/v/podcastsuite" alt="NPM PodcastSuite">  
 </a> 

### Features:
* Fetch RSS Content
* Proxy Request
* Parse XML-RSS Content
* Return a JS Object
* Async Events
* Caching Engine powered by indexDB
* Freshness status
* Offline Media

```javascript
import PS from 'podcastsuite';
const proxy = {
		'https:': 'https://cors.cleaner.com/',
		'http:': 'http://cors.cleaner.com'
	};

const fresh = 1000000;
const npr = "https://www.npr.org/rss/podcast.php?id=510318";
const lore = "https://feeds.megaphone.fm/lore";
const feedburner = "http://feeds.feedburner.com/SlatesTrumpcast";
const podcasts = [npr, lore, feedburner];

const Library = new PS({proxy, podcasts, fresh }); //
const podcast = Library.getPodcast(npr);


/*
IPodcast {
    title?: string;
    description?: string;
    url: string;
    link?: string;
    image?: string;
    items?: any[];
    created: number;
    length?: number;
}
*/

```
