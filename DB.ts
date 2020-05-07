import { set,get,keys,del, Store } from 'idb-keyval';

const toArray = () => new Promise(acc=>{
  keys().then(keys => acc(Promise.all(keys.map( (key) => get(key) ))));
});

export interface DBInstance {
  name: string;
  db: string;
  set: (key:IDBValidKey, value:any) => Promise<void>;
  get: (key:IDBValidKey) => Promise<any>;
  del: (key:IDBValidKey) => Promise<void>;
  keys: () => Promise<IDBValidKey[]>;
  entries: () => Promise<Array<any>>;
}

export default (name = "podcasts", db = "podcastsuite" ): DBInstance => ({ 
    name,
    db,
    set: function (key:IDBValidKey, value:any){
          const store = new Store(this.db,this.name);
          return set(key,value,store);
        },
    get: function (key:IDBValidKey): Promise<any> | null{
      const store = new Store(this.db,this.name);
      return get(key,store) || null;
    },
    del: function (key:IDBValidKey){
      const store = new Store(this.db,this.name);
      return del(key,store);
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