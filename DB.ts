import { set,get,keys,del, Store } from 'idb-keyval';

const toArray = () => new Promise(acc=>{
  keys().then(keys => acc(Promise.all(keys.map( (key) => get(key) ))));
});

export default (name = "podcasts", db = "podcastsuite" ) => ({ 
    name,
    db,
    set: function (key:string, value:any){
          const store = new Store(this.db,this.name);
          set(key,value,store);
        },
    get: function (key:string): Promise<any> | null{
      const store = new Store(this.db,this.name);
      return get(key,store) || null;
    },
    del: function (key:string){
      const store = new Store(this.db,this.name);
      del(key,store);
    }, 
    keys: async function(){
      const store = new Store(this.db,this.name);
      return await keys(store);
    },
    entries: async function(){
      const store = new Store(this.db,this.name);
      const keys = await this.keys(store);
      return keys.map( (key) => get(key) );
    }
  });