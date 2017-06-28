(function() {
	"use strict"
	//soundex from https://gist.github.com/shawndumas/1262659
	function soundex(a){a=(a+"").toLowerCase().split("");var c=a.shift(),b="",d={a:"",e:"",i:"",o:"",u:"",b:1,f:1,p:1,v:1,c:2,g:2,j:2,k:2,q:2,s:2,x:2,z:2,d:3,t:3,l:4,m:5,n:5,r:6},b=c+a.map(function(a){return d[a]}).filter(function(a,b,e){return 0===b?a!==d[c]:a!==e[b-1]}).join("");return(b+"000").slice(0,4).toUpperCase()};
	
	class MemStore {
		constructor() {
			this.data = {};
		}
		async clear() {
			this.data = {};
		}
		async count() {
			return Object.keys(this.data).length;
		}
		async delete(id) {
			delete this.data[id];
		}
		async get(id) {
			const data = this.data[id];
			if(data) return JSON.parse(data);
		}
		async key(number) {
			return Object.keys(this.data)[number];
		}
		async set(id,data) {
			this.data[id] = JSON.stringify(data);
			return id;
		}
	}
	
	class LocalStore {
		constructor(location="./db") {
			if(typeof(window)==="undefined") {
				const LocalStorage = require("node-localstorage").LocalStorage;
				this.storageProvider = new LocalStorage(location);
			} else {
				this.storageProvider = window.localStorage;
			}
		}
		async clear() {
			return this.storageProvider.clear();
		}
		async count() {
			return this.storageProvider.length;
		}
		async delete(id) {
			this.storageProvider.removeItem(id);
		}
		async get(id) {
			const data = this.storageProvider.getItem(id)
			if(data) return JSON.parse(data);
		}
		async key(number) {
			return this.storageProvider.key(number);
		}
		async set(id,data) {
			this.storageProvider.setItem(id,JSON.stringify(data));
			return id;
		}
	}
		
	class StorageProvider {
		constructor(storageProvider,options={}) {
			this.storageProvider = storageProvider;
			this.options = Object.assign({},options);
			this.options.idProperty || (this.options.idProperty="#key");
			this.constructors = {};
		}
		async clear() {
			return this.storageProvider.clear();
		}
		async count() {
			return this.storageProvider.count();
		}
		createId(root) {
			if(this.options.idGenerator) return this.options.idGenerator(root);
			return "#" + root + "#" + (Math.random()+"").substring(2);
		}
		async delete(idOrObject) {
			const {className,id} = this.parseId(idOrObject);
			if(className && className!=="" && id) this.storageProvider.delete(id);
		}
		ensureId(data,id) {
			const idproperty = this.options.idProperty;
			if(!data[idproperty]) {
				id || (id = this.createId(data.constructor.name));
				Object.defineProperty(data,idproperty,{enumerable:false,configurable:true,writable:true,value:id});
			} else {
				id = data[idproperty];
			}
			return id;
		}
		async get(id) {
			return await this.storageProvider.get(id);
		}
		async key(number) {
			return await this.storageProvider.key(number);
		}
		parseId(idOrObject) {
			const type = typeof(idOrObject);
			let id;
			if(!idOrObject || !["string","object"].includes(type)) return {};
			if(idOrObject && typeof(idOrObject)==="object") id = idOrObject[this.options.idProperty];
			else id = idOrObject;
			if(!id) return {};
			if(this.options.idParser) return this.options.idParser(id);
			if(id.indexOf("#")!==0) return {};
			const i = id.lastIndexOf("#");
			if(i<2) return {};
			return {className: id.substring(1,i), id: id.substring(i+1)}
		}
		async patch(data,create=true) {
			let object = await this.get(this.ensureId(data)),
				recurse = (target,data,done=new WeakMap()) => {
					if(Array.isArray(data)) {
						for(let i=0;i<data.length;i++) {
							const value = data[i];
							if(value && typeof(value)==="object") {
								if(done.has(value)) continue;
								done.set(value,true);
								if(Array.isArray(value)) {
									Array.isArray(target[i]) || (target[i] = []);
									recurse(target[i],value,done);
								} else {
									if(!target[i]) {
										target[i] = Object.create(value.constructor.prototype);
										Object.defineProperty(target[i],"constructor",{enumerable:false,configurable:true,writable:true,value:value.constructor});
									}
									recurse(target[i],value,done);
								}
							} else target[i] = value;
						}
					}
					for(let key in data) {
						const value = data[key];
						if(value && typeof(value)==="object") {
							if(done.has(value)) continue;
							done.set(value,true);
							if(Array.isArray(value)) {
								Array.isArray(target[key]) || (target[key] = []);
								recurse(target[key],value,done);
							} else {
								if(!target[key]) {
									target[key] = Object.create(value.constructor.prototype);
									Object.defineProperty(target[key],"constructor",{enumerable:false,configurable:true,writable:true,value:value.constructor});
								}
								recurse(target[key],value,done);
							}
						} else target[key] = value;
					}
					this.ensureId(target,data[this.options.idProperty]);
				}
			if(!object && !create) return;
			object || (object = Object.create(data.constructor.prototype));
			recurse(object,data);
			return await this.put(object);
		}
		async put(data,done=new WeakMap()) {
			if(!data || typeof(data)!=="object" || done.has(data)) return;
			this.ensureId(data);
			done.set(data,true);
			for(let key in data) {
				const value = data[key];
				if(Array.isArray(value)) {
					for(let item of value) await this.put(value,done);
				}
				await this.put(value,done);
			}
			return await this.set(data[this.options.idProperty],data);
		}
		register(constructor,name=constructor.name,overwrite) {
			let result = this.constructors[name];
			(result && !overwrite) || (result = this.constructors[name] = constructor);
			return result;
		}
		async set(id,data) {
			await this.storageProvider.set(id,data);
			return id;
		}
	}
	
	class CacheStore extends StorageProvider {
		constructor(storageProvider,options={}) {
			super(storageProvider,options);
			this.cache = {};
		}
		async delete(id) {
			this.cache.flush(id);
			await this.storageProvider.delete(id);
		}
		async get(id) {
			let data = this.cache[id];
			//console.log("get",id,data)
			if(data) return data;
			return this.storageProvider.get(id);
		}
		async set(id,data) {
			this.cache[id] = data;
			//console.log("set",id,data)
			this.storageProvider.set(id,data);
			return id;
		}
		flush(id) {
			if(id) delete this.cache[id];
			else this.cache = {};
		}
	}
	
	class StorageSerializer extends StorageProvider {
		constructor(storageProvider,options={}) {
			options.hidden || (options.hidden = []);
			super(...arguments);
		}
		// change so arrays  contentsget derefed
		decycle(object,references={}) {
			const me = this,
				id = me.ensureId(object,object[this.options.idProperty]),
				data = Object.assign({},object);
			data[this.options.idProperty] = id; // make a visible id for storage so recovery can be done if necessary
			if(!references[id]) {
				references[id] = data;
				for(let key in data) {
					const value = data[key];
					if(value) {
						if(Array.isArray(value)) {
							for(let item of value) {
								if(item && typeof(item)==="object") me.decycle(item,references);
							}
						}
						if(typeof(value)==="object") {
							const {decycled} = me.decycle(value,references);
							data[key] = {};
							data[key]["@reference"] = decycled[me.options.idProperty];
						}
					}
				}
			}
			for(let key of this.options.hidden) {
				const value = object[key];
				value===undefined || (data[key] = value);
			}
			return {decycled:data,references}
		}
		despecialize(data) {  // simplify with recursion
			if(Array.isArray(data)) {
				for(let i=0;i<data.length;i++) {
					const value = data[i];
					if(value==="@Infinity") data[i] = Infinity;
					else if(value==="@-Infinity") data[i] = -Infinity;
					else if(value==="@NaN") data[i] = Name;
				}
			}
			for(let key in data) {
				const value = data[key];
				if(value==="@Infinity") data[key] = Infinity;
				else if(value==="@-Infinity") data[key] = -Infinity;
				else if(value==="@NaN") data[key] = Name;
			}
			return data;
		}
		async get(uniqueId,parents=[],done={}) {
			const {className,id} = this.parseId(uniqueId);
			if(!id || !className || className==="") return
			if(done[uniqueId])  return done[uniqueId];
			const data = await this.storageProvider.get(uniqueId);
			let ctor = this.constructors[className];
			if(!ctor) {
				try {
					ctor = (new Function("return " + className))();
				} catch(e) {
					ctor = Object;
				}
			}
			if(data) {
				let object;
				if(ctor.fromJSON) {
					object = ctor.fromJSON(data,parents.slice())
				} else {
					object = Object.create(ctor.prototype);
					if(object instanceof Array) {
						object = new Array(); // Array's created with Object.create don't work properly in Chrome
						for(let key in data) {
							const i = parseInt(key);
							if(!isNaN(i) && i==key) object[i] = data[key];
							else object[key] = data[key];
						}
					} else Object.assign(object,data);
				}
				this.despecialize(object);
				this.ensureId(object,uniqueId);
				done[uniqueId] = object;
				parents.push(object);
				// change to support restroing array contents from references
				for(let key in object) {
					const value = object[key];
					if(value && typeof(value)==="object") {
						const id = value["@reference"];
						if(id) object[key] = await this.get(id,parents,done);
					}
					if(this.options.hidden.includes(key)) Object.defineProperty(object,key,{enumerable:false,configurable:true,writable:true,value:value});
				}
				parents.pop();
				return object;
			}
		}
		async set(id,data) {
			const {references} = this.decycle(data);
			for(let key in references) {
				const object = references[key];
				this.specialize(object);
				await this.storageProvider.set(key,object);
			}
			return id;
		}
		specialize(data) { // simplify with recursion
			if(Array.isArray(data)) {
				for(let i=0;i<data.length;i++) {
					const value = data[i];
					if(typeof(value)==="number") {
						if(value===Infinity) data[key] = "@Infinity";
						else if(value===-Infinity) data[key] = "-@Infinity";
						else if(isNaN(value)) data[key] = "@NaN";
					}
				}
			}
			for(let key in data) {
				const value = data[key];
				if(typeof(value)==="number") {
					if(value===Infinity) data[key] = "@Infinity";
					else if(value===-Infinity) data[key] = "-@Infinity";
					else if(isNaN(value)) data[key] = "@NaN";
				}
			}
		}
	}
	
	function ResultSet() {
		const results = [];
		results.objects = {};
		return new Proxy(results,{
			get: (target,property) => {
				if(ResultSet.prototype[property]) return ResultSet.prototype[property];
				return target[property];
			}
		})
	}
	
	// create a JOin object to join result sets anx CXProduct, event is to tell watchers what row to get for new item
	
	class Edge  {
		constructor(edgeName,parent,options={}) { // maxCount:1,associative:false,distributive:false,duplicates:false maxCount can be 1 ... Infinity, associative and distibutive only apply to objects
			Object.defineProperty(this,"parent",{enumerable:false,configurable:true,writable:true,value:parent});
			!edgeName || (this.edgeName = edgeName);
			this.options = Object.assign({},options);
			this.queryPath = (edgeName ? (this.parent.queryPath && this.parent.queryPath.length>0 ? this.parent.queryPath + "@" : "") + edgeName : "");
			this.ons = [];
		}
		back(count) {
			let node = this;
			while(count--) {
				const next = node.previous || node.parent;
				if(next) node = next;
				else break;
			}
			return node;
		}
		collect(collector) {
			return this.on(value => {
				if(typeof(collector.add)==="function") collector.add(value);
				else if(typeof(collector.push)==="function") collector.push(value);
				else if(typeof(collector.put)==="function") collector.put(value);
				else if(typeof(collector.write)==="function") collector.write(value);
			});
		}
		database() {
			let node = this.parent;
			while(node.parent) node = node.parent;
			return node;
		}
		get(edgeName,options={}) {
			return new Edge(edgeName,this,options);
		}
		off() {
			const database = this.database();
			delete database.subscriptions[this["#key"]];
		}
		on(cb) {
			const database = this.database();
			this.parts = this.queryPath.split("@");
			this["#key"] = database.createId(this.constructor.name);
			cb.processed = {};
			this.ons.push(cb);
			database.subscriptions[this["#key"]] = this;
			database.find(this.queryPath,(data,property,parent,root) => database.respond(root));		
			// initiate find from remote sources, should this be inside the local find and do a patch rather than put? save massive time?
			// add a delta method to get the differences for a patch?
			for(let i=1;i<database.sources.length;i++) {
				const source = database.sources[i];
				source.find(this.queryPath,(data,property,parent,root,timestamp) => database.put(root,false,source,timestamp));
			}
			return this;
		}
		patch(data,className=(data && typeof(data)==="object" && !Array.isArray(data) ? data.constructor.name : undefined)) {
			return this.put(data,className,true);
		}
		path(path,options) {
			const parts = path.split(".");
			let node = this.get(parts[0]);
			for(let i=1;i<parts.length;i++) node = node.get(parts[i],options);
			return node;
		}
		put(data,className=(data && typeof(data)==="object" && !Array.isArray(data) ? data.constructor.name : undefined),patch) {
			const parts = this.queryPath.split("@"),
				database = this.database();
			let newdata = {},
				result = newdata,
				leaf = newdata;
			for(let i=0;i<parts.length-1;i++) {
				leaf = result;
				result = result[parts[i]] = {};
			}
			!className || (data = Object.assign(Object.create(database.constructors[className] ? database.constructors[className].prototype : Object.prototype),data));
			result[parts[parts.length-1]] = data;
			database.put(newdata,patch);
			const where = Object.assign({},newdata);
			where["#key"] = newdata["#key"];
			let node = database.get(parts[0]);
			for(let i=1;i<parts.length;i++) node = node.get(parts[i]);
			return node.where(data).on(() => this.off());
		}
		uncollect(collector) {
			return this.on(value => {
				if(typeof(collector.delete)==="function") collector.delete(value);
				else if(typeof(collector.remove)==="function") collector.remove(value);
				else if(typeof(collector.del)==="function") collector.del(value);
				else if(Array.isArray(collector)) {
					const i = collector.indexOf(value);
					if(i>=0) collector.splice(i,1);
				}
			});
		}
	}
	Edge.predicates = {
			call: function(value,key) { return (typeof(value[key])==="function" ? value[key](...[].slice.call(arguments,2)) : undefined) },
			lt: (value,testvalue) => value<testvalue || undefined,
			lte: (value,testvalue) => value<=testvalue || undefined,
			between: (value,testvalue1,testvalue2) => (value>=testvalue1 && value<=testvalue2) || (value<=testvalue1 && value>=testvalue2) || undefined,
			outside: (value,testvalue1,testvalue2) =>  !((value>=testvalue1 && value<=testvalue2) || (value<=testvalue1 && value>=testvalue2)) || undefined,
			eq: (value,testvalue) => value==testvalue || undefined,
			eeq: (value,testvalue) => value===testvalue || undefined,
			neq: (value,testvalue) => value!=testvalue || undefined,
			neeq: (value,testvalue) => value!==testvalue || undefined,
			gte: (value,testvalue) => value>=testvalue || undefined,
			gt: (value,testvalue) => value>testvalue || undefined,
			echoes: (value,testValue) => value==testValue || soundex(value)===soundex(testValue) || undefined,
			excludes: (value,testvalue) => !value || typeof(value.includes)!=="function" || !value.includes(testvalue) || undefined,
			includes: (value,testvalue) => (value && typeof(value.includes)==="function" && value.includes(testvalue)) || undefined,
			nin: (value,testvalue) => !testvalue || typeof(testvalue.includes)!=="function" || !testvalue.includes(value) || undefined,
			in: (value,testvalue) => (testvalue && typeof(testvalue.includes)==="function" && testvalue.includes(value)) || undefined,
			instanceof: function(value,cls) { return (value && typeof(value)==="object" && value instanceof (typeof(cls)==="function" ? cls : (this.constructors[cls] ? this.constructors[cls] : new Function("return " + cls)()))) || undefined },
			isArray: value => Array.isArray(value) || undefined,
			isNaN: value => isNaN(value) || undefined,
			matches: (value,regexp) => (typeof(regexp)==="string" ? new RegExp(regexp).test(value) : regexp.test(value)) || undefined,
			map: (value,functionOrValue) => {
				const type = typeof(functionOrValue)
				let result = value;
				if(type==="function") {
					if(Array.isArray(value)) {
						result = [];
						for(let i=0;i<value.length;i++) {
							const v = functionOrValue(value[i],i,value);
							if(v!==undefined) result.push(v);
						}
					} else if(typeof(value)==="object") {
						result = {};
						!value["#key"] || Object.defineProperty(result,"#key",{enumerable:false,configurable:true,writable:true,value:value["#key"]});
						let some = false;
						for(let key in value) {
							const v = functionOrValue(value[key],key,value);
							if(v!==undefined) {
								result[key] = v;
								some = true;
							}
						}
						some || (result = undefined);
					} else {
						result = functionOrValue(value);
					}
				} else if(type!=="undefined") result = functionOrValue
				return result;
			},
			search: (value,testValue,caseSensitive=true) => {
				if(!value) return false;
				caseSensitive || (value = value.toLowerCase());
				caseSensitive || (testValue = testValue.toLowerCase());
				const tokens = testValue.split(" ");
				return tokens.every((testValue) => value.indexOf(testValue)>=0);
			},
			typeof: (value,type) => typeof(value)===type || undefined,
			where: (data,pattern) => {
				if(data===undefined) return false;
				for(let key in pattern) {
					const value = pattern[key];
					if(value && typeof(value)==="object") {
						let predicate = Object.keys(value)[0];
						const testvalue = value[predicate];
						if(predicate && predicate[0]==="$") {
							if(predicate==="$") {
								const f = new Function("return " + testvalue)();
								if(typeof(f)==="function") {
									if(!f(data[key])) return;
									continue;
								}
								return;
							} else {
								predicate = predicate.substring(1);
								if(Edge.predicates[predicate]) {
									if(!Edge.predicates[predicate](data[key],testvalue)) return;
									continue;
								}
							}
						}
						if(!Edge.predicates.where(data[key],value)) return;
					} else if(value!==data[key]) return;
				}
				return data;
			}
	}
	for(let key in Edge.predicates) {
		Object.defineProperty(Edge.prototype,key,{enumerable:false,configurable:true,value: function(testvalue) {
				const type = typeof(testvalue),
					args = (testvalue===undefined ? "[]" : (type==="function" ? "[" + testvalue + "]" : JSON.stringify([...arguments]))); 
				this.queryPath += (this.queryPath.length>0 ? "@" : "") + key + "@" + args;
				return this;
			}
		});
	}
	Edge.fromJSON = function(data,parents) {
		let parent = parents.pop();
		while(parent && !(parent instanceof Edge || parent instanceof Database)) parent = parents.pop();
		const instance = new Edge(null,parent);
		return Object.assign(instance,data);
	}
	
	class RemoteDatabase {
		constructor(local,address) {
			this.local = local;
			this.address = address;
			this.paths = {};
			this.dummy = new Database("dummy");
		}
		async find(path,cb) {
			if(!this.loaded) {
				await this.dummy.load();
				this.loaded = true;
			}
			const me = this;
			this.dummy.find(path,cb);
		}
		async patch(data) {
			if(!this.loaded) {
				await this.dummy.load();
				this.loaded = true;
			}
			return this.dummy.patch(data);
		}
		async path(path) {
			if(!this.loaded) {
				await this.dummy.load();
				this.loaded = true;
			}
			return this.dummy.path(path);
		}
		async put(data) {
			if(!this.loaded) {
				await this.dummy.load();
				this.loaded = true;
			}
			return this.dummy.put(data);
		}
		register(constructor) {
			return this.dummy.register(constructor);
		}
		async time() {
			if(!this.loaded) {
				await this.dummy.load();
				this.loaded = true;
			}
			return this.dummy.time();
		}
	}
		
	class Database {
		constructor(name,storage=new MemStore(),options={}) {
			this["#key"] = "#Database#" + name;
			// make these visible?
			Object.defineProperty(this,"root",{enumerable:false,configurable:true,writable:true,value:new Edge(null,this)});
			Object.defineProperty(this,"subscriptions",{enumerable:false,configurable:true,writable:true,value:{}});
			Object.defineProperty(this,"sinks",{enumerable:false,configurable:true,writable:true,value:[]});
			Object.defineProperty(this,"sources",{enumerable:false,configurable:true,writable:true,value:[]});
			Object.defineProperty(this,"constructors",{enumerable:false,configurable:true,writable:true,value:{}});
			if(options.nocache) this.peer(new StorageSerializer(storage,{hidden:["#key","@metadata"]}));
			else this.peer(new CacheStore(new StorageSerializer(storage,{hidden:["#key","@metadata"]})));
		}
		activate(data,done=new WeakMap()) {
			const me = this,
				type = typeof(data);
			if(!data || type!=="object" || data.__activated__!==undefined || done.has(data)) return data;
			done.set(data,true);
			this.register(data.constructor);
			Object.defineProperty(data,"__activated__",{enumerable:false,configurable:true,writable:true,value:true});
			const keys = Object.keys(data);
			data["#key"] || Object.defineProperty(data,"#key",{enumerable:false,configurable:true,writable:true,value:this.createId(data.constructor.name)});
			if(!data["@metadata"]) {
				Object.defineProperty(data,"@metadata",{enumerable:false,configurable:true,writable:true,value:{properties:{}}});
				const metadata = data["@metadata"];
				keys.forEach(key => {
					metadata.properties[key] = {touched: me.time(), state:1};
				});
			}
			keys.forEach(key => {
				const desc = Object.getOwnPropertyDescriptor(data,key),
					set = async function(value) {
						if(this[key]===value) return true;
						if(desc.set) desc.set(value);
						else desc.value = value;
						const patch = {},
							state = this["@metadata"].properties[key].state++;
						patch["#key"] = this["#key"];
						patch[key] = value;
						patch["@metadata"] = {properties:{}};
						patch["@metadata"].properties[key] = {touched:me.time(), state:state};
						for(let storageProvider of me.sinks) await storageProvider.patch(patch);
						return true;
					},
					get = (desc.get ? desc.get : function() { return desc.value; });
				if(desc.configurable) Object.defineProperty(data,key,{enumerable:desc.enumerable,configurable:true,get,set});
				me.activate(desc.value);
			});
			return data;
		}
		createId(root) {
			return "#" + root + "#" + (Math.random()+"").substring(2);
		}
		async find(path,cb,create) {
			const parts = path.split("@"),
				storage = this.sources[0];
			let i = 0;
			while(i < await storage.count()) {
				const id = await storage.key(i++);
				let lastkey,
					parent,
					data = await storage.get(id);
				if(!data) continue;
				data = this.activate(data);
				const root = data;
				for(let i=0;i<parts.length && data!=null;i++) {
					const part = parts[i];
					if(Edge.predicates[part]) {
						const result = Edge.predicates[part].call(this,data,...new Function("return " + parts[++i])());
						if(result===undefined) {
							data = result;
							break;
						}
						if(part==="map") data = result;
					} else {
						lastkey = part;
						parent = data;
						data = data[part] || (create ? data[part] = {} : null);
					}
				}
				if(data && cb) cb(data,lastkey,parent,root,this.time());
			}
			
		}
		get(edgeName,options) {
			return this.root.get(edgeName,options);
		}
		async load() {
			const config = await this.sources[0].get(this["#key"]);
			if(config) {
				Object.assign(this,config);
				this.root.parent = this;
				return true;
			}
			this.sinks[0].put(this);
			return false;
		}
		patch(data) {
			for(let storageProvider of this.sinks) storageProvider.patch(data);
		}
		peer(storageProvider) {
			this.sink(storageProvider);
			this.source(storageProvider);
		}
		onError(error) {
			console.log(error);
		}
		/*
		So I doubt I am so smart as to have come up with a new way of dealing with time drift across machines and data sync; 
		however, I can't figure out when this would not work. Assume all time stamps are ISO Zulu. Assume all object properties
		have metadata 'touched' for the most recent update time and also bump a version number. When a remote database sends data it includes `sentTime`, computed 
		at the moment of transmission. Assume upon receipt the receiving database asks the sender for its time, 'remoteTime' and 
		also computes its local time, 'localTime'. If the 'sentTime' is greater than 'remoteTime', the data is rejected as a 
		potential spoof. If  'touched' for any property is greater than 'remoteTime' or 'sentTime', the data is rejected as 
		a potential spoof. The 'skew' is computed as (`localTime` - `remoteTime`) + (`remoteTime` - `sentTime`). If values are 
		not equal and a remote 'touched' is not equal a local 'touched' and is greater than a local 'touched' - 'skew'; then, 
		the property is updated using the remote 'touched' once the localTime >= the sentTime, unless the state increment
		is less than the current state increment. I have run thousands of transactions on a local machine using two 
		asynchronous data sources (dummied up, not using Gun). About 2% of the time (`localTime` - `remoteTime`)  
		and (`remoteTime` - `sentTime`) will be 1 and -1 and cancel each other out. About 1% of the time I will get a positive 
		`skew` of 1 ms. However, since my `touch` times are equal, no update occurs. Before ramping up to do a multi-machine 
		test or simulating skew I figured I would ask what I am missing!
		*/
		async patch(data) {
			return await this.put(data,true);
		}
		path(path,options) {
			return this.root.path(edgeName,options);
		}
		async put(data,patch,source,sent) {
			const type = typeof(data),
				now = Date.parse(this.time()),
				senttime = (sent ? Date.parse(sent) : now),
				remotetime = (source ? Date.parse(await source.time()) :  now),
				localtime = (source ? now : remotetime),
				skew = (localtime - remotetime) + (remotetime - senttime);
			if(senttime>remotetime) {
				console.log(`Rejecting data, remote time, {remotetime}, greater than sent time, {senttime}`,data);
				return;
			}
			//console.log("skew",skew,localtime - remotetime,remotetime-senttime);
			if(data && type==="object") {
				//this.register(data.constructor);
				let existing,
					changes,
					patched = false;
				if(data["#key"]) {
					existing = await this.sources[0].get(data["#key"]);
					if(existing) {
						changes = {"#key": data["#key"], "@metadata":{properties:{}}};
						for(let key in data) {
							const touched = data["@metadata"].properties[key].touched;
							if(touched>remotetime || touched>senttime) {
								console.log(`Rejecting data, remote update time, {touched}, greater than sent time, {senttime}, or remote time, {remotettime} for {key}`,data);
								return;
							}
							const value = data[key],
								existingvalue = existing[key];
							if(value && typeof(value)==="object") {
								if(existingvalue && typeof(existingvalue)==="object") {
									if(existingvalue["#key"]!==value["#key"]) {
										changes[key] = data[key]; // do we need to add touch stamps to key?
										changes["@metadata"].properties[key] = data["@metadata"].properties[key];
									}
									// else do a recursive check??
								}
							} else if(existingvalue!==data[key]) {
								if(touched!==existing["@metadata"].properties[key].touched && touched>existing["@metadata"].properties[key].touched-skew) {
									patched = true;
									changes[key] = data[key];
									changes["@metadata"].properties[key] = data["@metadata"].properties[key];
								}
							}
						}
					}
				}
				if(!existing || patched) {
					const sinks = this.sinks;
					this.activate(data);
					for(let i=1;i<sinks.length;i++) sinks[i].patch(changes || data);
					await sinks[0].put(changes || data);
					await sinks[0].put(this);
					this.respond(changes || data,null,null,patched);
				}
			}
		}
		register(constructor) {
			for(let sink of this.sinks) sink.register(constructor);
			return this.constructors[constructor.name] || (this.constructors[constructor.name] = constructor);
		}
		async respond(ovalue,oproperty,oparent=ovalue,patched,processed={}) {
			for(let key in this.subscriptions) {
				const node = this.subscriptions[key];
				let data = ovalue,
					property = oproperty,
					parent = oparent,
					value, 
					lastkey;
				for(let i=0;i<node.parts.length;i++) {
					const key = node.parts[i];
					//if(i===0 && edges[key] && edges[key] instanceof ClassEdge) continue;
					if(Edge.predicates[key]) {
						const args = node.parts[++i],
							result = Edge.predicates[key].call(this,data,...new Function("return " + args)());
						if(result===undefined) {
							value = result;
							break;
						}
						if(key==="map" || key==="call") value = data = result;
						else if(key==="patch") {
							if(data === result) continue;
							value = data = parent[property] = result;
						} else if(key==="where") value = result;
					} else  {
						value = data[key];
						lastkey = key;
						if(value===undefined) break;
						parent = data;
						data = value;
						/*if(value && typeof(value)==="object" && !processed[value["#key"]]) { // is this recursion really correct
							processed[value["#key"]] = true;
							await this.respond(value,key,data,patched,processed);
						}*/
					}
				}
				if(value!==undefined) {
					for(let on of node.ons) {
						if(!on.processed[parent["#key"]] || patched) {
							on.processed[parent["#key"]] = true;
							on.call(node,value,lastkey,parent);
						}
					}
				}
			}
		}
		sink(storageProvider) {
			this.sinks.push(storageProvider);
		}
		source(storageProvider) {
			this.sources.push(storageProvider);
		}
		time() {
			const iso = (new Date()).toISOString();
			return Date.parse(iso.substring(0,iso.length-1));
		}
		where(pattern) {
			return new Edge(null,this).where(pattern);
		}
	}
	Database.MemStore = MemStore;
	Database.LocalStore = LocalStore;
	Database.RemoteDatabase = RemoteDatabase;
	Database.fromJSON = function(data) {
		const instance = new Database();
		return Object.assign(instance,data);
	}
	if(typeof(module)!=="undefined") {
		module.exports = Database;
	} else {
		window.Database = Database;
	}
}).call(this);