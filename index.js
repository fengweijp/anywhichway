(function() {
	"use strict"
	var cryptozoa;
	if(typeof(module)!=="undefined") {
		cryptozoa = require("cryptozoa");
	} else {
		cryptozoa = window.cryptozoa;
	}
	var undfnd;
	const UNDEFINED = undfnd;
	//soundex from https://gist.github.com/shawndumas/1262659
	const soundex = (a) => {a=(a+"").toLowerCase().split("");var c=a.shift(),b="",d={a:"",e:"",i:"",o:"",u:"",b:1,f:1,p:1,v:1,c:2,g:2,j:2,k:2,q:2,s:2,x:2,z:2,d:3,t:3,l:4,m:5,n:5,r:6},b=c+a.map(function(a){return d[a]}).filter(function(a,b,e){return 0===b?a!==d[c]:a!==e[b-1]}).join("");return(b+"000").slice(0,4).toUpperCase()};
	
	//https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
	const uuidv4 = () => {
	  	let d = Date.now();
	    if (typeof performance !== "undefined" && typeof performance.now === "function"){
	        d += performance.now(); //use high-precision timer if available
	    }
	    return "00000000-0000-4000-8000-000000000000".replace(/[08]/g, c => {
	        const r = (d + Math.random() * 16) % 16 | c;
	        d >>>= 4;
	        return r.toString(16);
	    });
	}
	
	const asyncForEach = async (array,f) => {
		for(let i=0;i<array.length;i++) {
			await f(array[i],i,array);
		}
	}
	
	const asyncEvery = async (array,f) => {
		for(let i=0;i<array.length;i++) {
			if(!(await f(array[i],i,array))) return false;
		}
		return true;
	}
	
	const asyncSome = async(array,f) => {
		for(let i=0;i<array.length;i++) {
			if((await f(array[i],i,array))) return true;
		}
		return false;
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
	class Interceptor {
		constructor(instance,intercepts) {
			return new Proxy(instance,{
				get: (target,property) => {
					if(intercepts[property]) {
						return intercepts[property];
					}
					return instance[property];
				}
			});
		}
	}
	class JSONStorageInterceptor {
		constructor(store) {
			const intercepts = {
				get: async function(id,block=[]) {
					const buffer = await store.get(id,block);
					if(buffer) { return JSON.parse(buffer.toString().replace(/[\0\n]/g,"").trim()); }
				},
				set: async function(id,data) {
					return store.set(id,JSON.stringify(data)+"\n");
				}
			};
			intercepts.getItem = intercepts.get;
			intercepts.setItem = intercepts.set;
			return new Interceptor(store,intercepts);
		}
	}
	class EncryptedStorageInterceptor {
		constructor(store,password) {
			const intercepts = {
					get: async function(id,block=[]) {
						const buffer = await store.get(id,block);
						if(buffer) {
							return await cryptozoa.symmetric.decrypt(buffer.toString(),password);
						}
					},
					set: async function(id,data) {
						const result = await cryptozoa.symmetric.encrypt(data,password);
						return store.set(id,result.data);
					}
				};
			intercepts.getItem = intercepts.get;
			intercepts.setItem = intercepts.set;
			return new Interceptor(store,intercepts);
		}
	}
	class StorageSerializer {
		constructor(storageProvider,options={}) {
			options.hidden || (options.hidden = []);
			this.storageProvider = storageProvider;
			this.options = Object.assign({},options);
			this.options.idProperty || (this.options.idProperty="#key");
			this.constructors = {};
		}
		async clear() {
			return await this.storageProvider.clear();
		}
		async count() {
			return await this.storageProvider.count();
		}
		createId(root,id) {
			if(this.options.idGenerator) return this.options.idGenerator(root,id);
			return (root ? "#" + root : "") + "#" + (id!==UNDEFINED ? id : Database.uuidv4());
		}
		async delete(idOrObject) {
			const {className,id} = this.parseId(idOrObject);
			if(className && className!=="" && id) this.storageProvider.delete(id);
		}
		ensureId(data,id) {
			const classname = data.constructor.name,
				idproperty = this.options.keyPath[this.options.keyPath.length-1]; // this.options.idProperty;
			for(let i=0;i<this.options.keyPath.length-1;i++) {
				const key = this.options.keyPath[i];
				if(!data[key]) {
					Object.defineProperty(data,key,{enumerable:false,configurable:true,writable:true,value:{}})
				}
				data = data[key];
			}
			if(!data[idproperty]) {
				id || (id = this.createId(classname));
				Object.defineProperty(data,idproperty,{enumerable:false,configurable:true,writable:true,value:id});
			} else {
				id = data[idproperty];
			}
			return id;
		}
		getId(data) {
			let id;
			if(data && typeof(data)==="object") {
				for(let i=0;i<this.options.keyPath.length && data;i++) {
					const key = this.options.keyPath[i];
					id = data = data[key];
				}
			}
			return id;
		}
		async key(number) {
			return await this.storageProvider.key(number);
		}
		parseId(idOrObject) {
			const type = typeof(idOrObject);
			let id;
			if(!idOrObject || !["string","object"].includes(type)) return {};
			if(idOrObject && typeof(idOrObject)==="object") {
				for(let i=0;i<this.options.keyPath.length && idOrObject;i++) {
					const key = this.options.keyPath[i];
					id = idOrObject = idOrObject[key];
				}
			} else {
				id = idOrObject;
			}
			if(!id) return {};
			if(this.options.idParser) return this.options.idParser(id);
			if(id.indexOf("#")!==0) return {};
			const i = id.lastIndexOf("#");
			if(i<2) return {};
			return {className: id.substring(1,i), id: id.substring(i+1)}
		}
		register(constructor,name=constructor.name,overwrite) {
			let result = this.constructors[name];
			(result && !overwrite) || (result = this.constructors[name] = constructor);
			return result;
		}
		// change so arrays  contentsget derefed
		decycle(object,references={}) {
			const id = this.ensureId(object),
				data = Object.assign({},object);
			if(!references[id]) {
				references[id] = data;
				for(let key in data) {
					const value = data[key];
					if(value) {
						if(Array.isArray(value)) {
							for(let item of value) {
								if(item && typeof(item)==="object") this.decycle(item,references);
							}
						}
						if(typeof(value)==="object") {
							const {decycled} = this.decycle(value,references);
							data[key] = {};
							data[key]["#"] = this.getId(decycled);
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
					else if(value==="@NaN") data[i] = NaN;
				}
			}
			for(let key in data) {
				const value = data[key];
				if(value==="@Infinity") data[key] = Infinity;
				else if(value==="@-Infinity") data[key] = -Infinity;
				else if(value==="@NaN") data[key] = NaN;
			}
			return data;
		}
		async get(uniqueId,parents=[],done={}) {
			const {className,id} = this.parseId(uniqueId);
			if(!id || !className || className==="") return
			if(done[uniqueId])  return done[uniqueId];
			let data = await this.storageProvider.get(uniqueId);
			
			//if(typeof(data)!=="string") { data = JSON.parse(data.toString()); }; // should not have to do this, CAche isse or JSOnBlcokStore?
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
				} else if(className==="Date") {
					object = new Date();
					object.setTime(data.time);
					delete data.time;
					object = Object.assign(object,data);
				} else {
					object = Object.create(ctor.prototype);
					if(object instanceof Array) {
						object = new Array(); // Array's created with Object.create don't work properly in Chrome
						for(let key in data) {
							const i = parseInt(key);
							if(!isNaN(i) && i==key) object[i] = data[key];
							else object[key] = data[key];
						}
					} else {
						object = Object.assign(object,data);
					}
				}
				this.despecialize(object);
				this.ensureId(object,uniqueId);
				done[uniqueId] = object;
				parents.push(object);
				// change to support restroing array contents from references
				for(let key in object) {
					const value = object[key];
					if(this.options.hidden.includes(key)) Object.defineProperty(object,key,{enumerable:false,configurable:true,writable:true,value:value});
					else if(value && typeof(value)==="object") {
						const id = value["#"];
						if(id) {
							let child = await this.get(id,parents,done);
							//if(typeof(child)!=="string") { child = JSON.parse(child.toString()); };
							object[key] = child;
						}
					}
					
				}
				parents.pop();
				return object;
			}
		}
		async put(data,done=new WeakMap()) {
			if(done.has(data)) { return; }
			const id = this.ensureId(data),
				keys = Object.keys(data);
			done.set(data,true);
			for(let key of keys) {
				const value = data[key];
				if(Array.isArray(value)) {
					for(let item of value) await this.put(value,done);
				}
				if(value && typeof(value)==="object") {
					await this.put(value,done);	
				}
			}
			return await this.set(id,data);
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
	
	class Query {
		constructor(database,pattern,on,sterilize=0,monitor=true) {
			const me = this;
			this.database = database;
			this.pattern = this.sterilized(sterilize,pattern);
			if(monitor) {
				const id = database.createId("Query");
				let matches, count = 0;
				Object.defineProperty(this,"_",{enumerable:false,configurable:true,writeable:true,value:{"#": id}});
				database.queries[id] = this;
				const properties = Object.keys(this.pattern).filter((property) => database.index && (property[0]!=="$" || ["$year"].includes(property)) && database.index[property] &&  (pattern[property]===null || typeof(pattern[property])!=="object")), // typeof(pattern[property])!=="object"
					counts = {};
				if(properties.length>0) {
					for(let property of properties) {
						counts[property] = database.index[property].referenceCount;
					}
					properties.sort((a,b) => counts[a] - counts[b]);
					for(let i=0;i<properties.length;i++) {
						const property = properties[i],
							value = this.pattern[property],
							type = typeof(value);
						const nextmatches = (database.index[property][value] ? database.index[property][value][type] : null);
						if(database.index[property][value] && nextmatches) {
							if(!matches) {
								matches = Object.assign({},nextmatches);
								count = Object.keys(matches).length;
							} else {
								for(let id in matches) {
									if(!nextmatches[id]) {
										delete matches[id];
										count--;
									}
								}
							}
						}
						if(!nextmatches || count===0) {
							return;
						}
					}
					for(let id in matches) {
						database.storage.get(id).then((data) => {
							database.activate(data,id);
							this.test(data,pattern).then((result) => {
								if(on && result) on(result);
							});
						});
					}
				} else {
					this.testAll(on);
				}
			}
		}
		async testAll(cb,sterilize=0) {
			const database = this.database,
				storage = database.storage,
				count = await storage.count(),
				pattern = this.sterilized(sterilize); // sterlize gets call multipel times, should have a -1 flag to prevent multiple calls
			let i = 0;
			while(i < count) {
				const id = await storage.key(i++);
				const data = await storage.get(id);
				if(sterilize<1) database.activate(data,id);
				const result = await this.test(data,pattern);
				if(cb && result) cb(result);
			}
		}
		async test(value,pattern,limits,key,object) {
			const me = this,
				database = this.database;
			pattern || (pattern = this.pattern);
			if(value===pattern) return value;
			if(!pattern || typeof(pattern)!=="object") return;
			if(await asyncEvery(Object.keys(pattern),async (part) => {
				if(part[0]==="$") {
					if(part==="$..") {
						console.log(value._[".."]); //{$..: {}}
						return await asyncEvery(Object.keys(value._[".."]), async (property) => {
							return await asyncSome(Object.keys(value._[".."][property]), async (parentid) => {
								let parent,
									reference = value._[".."][property][parentid];
								if(!reference || typeof(reference)!="object" || !(reference instanceof Reference)) {
									parent = await database.get(parentid);
									value._[".."][property][parentid] = new Reference(parent);
								} else {
									parent = reference.value;
								}
								return await me.test(parent,pattern[part]);
							});
						});
						//return true;
					} else if(part==="$") {
						const f = new Function("return " + pattern[part])();
						if(typeof(f)==="function") {
							if(f.call(me,value,key,object)===undefined) return false;
							return true;
						}
						return false; // perhaps throw?
					} else if(part.indexOf("$$")===0) {
						const f = value[part.substring(2)];
						if(typeof(f)==="function") {
							if(f.call(value,pattern[part],key,object)===undefined) return false;
							return true;
						}
						return false; // perhaps throw?
					} else if(part==="$not") { // need to make shared/recursive not $not: {$not: is supported
						return !(await me.test(value,pattern[part],limits,key,object));
					} else if(part==="$define") {
						value[pattern[part]]!==undefined || (value[pattern[part]] = undefined); // very special case, see activate
						database.activateKey(value,pattern[part]);
						return true;
					} else {
						const commandname = part.substring(1);
						if(Query.commands[commandname].call((commandname==="instanceof" ? me : null),pattern[part],value,key,object)===undefined) return false;
						if(part==="$set") { value = object[key]; }
						return true;
					}
				} else if(value && typeof(value)==="object" && (!limits || limits[part])){
					// "true" is end of limit, all other tests should be conducted, so pass null
					return await me.test(value[part],pattern[part],(limits ? (limits[part]===true ? null : limits[part]) : null),part,value);
				}
			})) {
				return (value==null || Number.isNaN(value) || value==="" || value===0 ? true : value);
			}
		}
		sterilized(level,pattern,result={}) {
			pattern || (pattern = this.pattern);
			let remove;
			if(typeof(level)==="number") {
				if(level<1) {
					return pattern;
				}
				if(level>=1) {
					remove = ["$define","$on","$set","$collect","$uncollect"];
				}
				if(level>=2) {
					remove = remove.concat(["$","$map","$every","$some"]);
				}
				if(level>=3) {
					remove = remove.concat(["$$"]);
				}
				if(level>=4) {
					remove = remove.concat(["$"]);
				}
			} else {
				remove = level
			}
			for(let key in pattern) {
				if(remove.includes(key) || (key.indexOf("$$")===0 && remove.includes("$$")) || (key[0]==="$" && remove.includes("$"))) break;
				const value = pattern[key];
				if(value && typeof(value)==="object") {
					result[key] = {};
					this.sterilized(remove,value,result[key]);
				} else {
					result[key] = value;
				}
			}
			return result;
		}
	}
	Query.commands = {
			// for security reasons, these are not arrow functons, they all get invoked with this=null
			// predicates
			lt(testvalue,value) { return value<testvalue || UNDEFINED},
			lte(testvalue,value) { return value<=testvalue || UNDEFINED},
			between(testvalue,value) { return ((value>=testvalue[0] && value<=testvalue[1]) || (value>=testvalue[1] && value<=testvalue[0])) || UNDEFINED },
			outside(testvalue,value) { return !((value>=testvalue[0] && value<=testvalue[1]) || (value>=testvalue[1] && value<=testvalue[0])) || UNDEFINED; },
			eq(testvalue,value) { return testvalue==value || UNDEFINED; },
			eeq(testvalue,value) { return testvalue===value || UNDEFINED; },
			neq(testvalue,value) { return testvalue!=value || UNDEFINED; },
			neeq(testvalue,value) { return testvalue!==value || UNDEFINED; },
			gte(testvalue,value) { return value>=testvalue || UNDEFINED; },
			gt(testvalue,value) { return value>testvalue || UNDEFINED; },
			echoes(testvalue,value) { return testvalue==value || soundex(testvalue)===soundex(value) || UNDEFINED; },
			excludes(testvalue,value) { return typeof(value.includes)!=="function" || !value.includes(testvalue) || UNDEFINED; },
			includes(testvalue,value) { return (typeof(value.includes)==="function" && value.includes(testvalue)) || UNDEFINED; },
			intersects(testvalue,value) { return (typeof(testvalue.some)==="function" && typeof(value.some)==="function" && testvalue.some((item) => value.includes(item)) && value.some((item) => testvalue.includes(item))) || UNDEFINED; },
			disjoint(testvalue,value) { return !(typeof(testvalue.some)==="function" && typeof(value.some)==="function" && testvalue.some((item) => value.includes(item)) && value.some((item) => testvalue.includes(item))) || UNDEFINED; },
			coincident(testvalue,value) { return (typeof(testvalue.some)==="function" && typeof(value.some)==="function" && testvalue.length===value.length && testvalue.every((item) => value.includes(item)) && value.every((item) => testvalue.includes(item))) || UNDEFINED; },
			nin(testvalue,value) { return typeof(testvalue.includes)!=="function" || !testvalue.includes(value) || UNDEFINED; },
			in(testvalue,value) { return (typeof(testvalue.includes)==="function" && testvalue.includes(value)) || UNDEFINED; },
			instanceof(cls,value) { return (value && typeof(value)==="object" && value instanceof (typeof(cls)==="function" ? cls : (this.constructors[cls] ? this.constructors[cls] : new Function("return " + cls)()))) || UNDEFINED; },
			isArray(property,value) { return (property && Array.isArray(value[property])) || Array.isArray(value) || UNDEFINED; },
			isNaN(property,value) { return (property && Number.isNaN(value[property])) || Number.isNaN(value) ||  UNDEFINED; },
			matches(regexp,value) { return (typeof(regexp)==="string" ? new RegExp(regexp).test(value) : regexp.test(value)) || UNDEFINED; },
			
			// navigation
			// $.. handled inside of Query test function
			
			// procedural commands
			map(f,value) { if(typeof(value.map)==="function") { return value.map(f); } },
			every(f,value) { if(typeof(value.every)==="function" && value.every(f)) { return true; } },
			some(f,value)  { if(typeof(value.some)==="function" && value.some(f)) { return true; } },
			on(f,value,key,object) {
				f(value,key,object);
				return true;
			},
			search(testvalue,value,caseSensitive=true) {
				if(!value) return false;
				caseSensitive || (value = value.toLowerCase());
				caseSensitive || (testvalue = testvalue.toLowerCase());
				const tokens = testvalue.split(" ");
				if(tokens.every((testValue) => value.indexOf(testvalue)>=0)) {
					return true;
				}
			},
			collect(collector,value) {
				if(typeof(collector.add)==="function") collector.add(value);
				else if(typeof(collector.push)==="function") collector.push(value);
				else if(typeof(collector.put)==="function") collector.put(value);
				else if(typeof(collector.write)==="function") collector.write(value);
				return true;
			},
			uncollect(collector,value) {
				if(typeof(collector.delete)==="function") collector.delete(value);
				else if(typeof(collector.remove)==="function") collector.remove(value);
				else if(typeof(collector.del)==="function") collector.del(value);
				else if(Array.isArray(collector)) {
					const i = collector.indexOf(value);
					if(i>=0) collector.splice(i,1);
				}
				return true;
			},
			set(newvalue,_,key,object) {
				object[key] = newvalue;
				return true;
			},
			typeof(type,value) { return typeof(value)===type || UNDEFINED; }
	}
	class Index {
		constructor() {
			 
		}
		delete(object) {
			for(let key in object) {
				if(this[key]) {
					this[key].delete(object[key],object._["#"]);
				}
			}
		}
		put(object,done=new Set()) {
			const keys = Object.keys(object);
			if(object instanceof Date) {
				keys.splice(0,0,...["year","month","date","day","hours","minutes","seconds","milliseoncds","timezoneOffset","UTCYear","UTCMonth","UTCDate","UTCDay","UTCHours","UTCMinutes","UTCSeconds","UTCMilliseoncds"]);
			}
			for(let key of keys) {
				const value = object[key],
					type = typeof(value);
				this[key] || (this[key] = new PropertyIndex());
				this[key].put(value,object._["#"],type);
				if(value && type==="object" && !done.has(value)) {
					done.add(value);
					this.put(value,done);
				}
			}
		}
		get referenceCount() {
			let count = 0;
			for(let property in this) {
				count += this[property].referenceCount;
			}
			return count;
		}
	}
	class PropertyIndex {
		constructor() {
			
		}
		delete(value,id,type=typeof(value)) {
			value = (value && type=="object" ? value._["#"] : value);
			if(this[value]) {
				this[value].delete(type,id);
			}
		}
		put(value,id,type=typeof(value)) {
			this[value] || (this[value] = new TypeIndex());
			this[value].put(type,id);
		}
		get referenceCount() {
			let count = 0;
			for(let value in this) {
				count += this[value].referenceCount;
			}
			return count;
		}
	}
	class TypeIndex {
		constructor() {
			
		}
		delete(type,id) {
			if(this[type]) {
				this[type].delete(id);
			}
		}
		put(type,id) {
			this[type] || (this[type] = new ReferenceIndex());
			this[type].put(id);
		}
		get referenceCount() {
			let count = 0;
			for(let type in this) {
				count += this[type].referenceCount;
			}
			return count;
		}
	}
	class ReferenceIndex {
		constructor() {
			Object.defineProperty(this,"referenceCount",{enumerable:false,configurable:true,writable:true,value:0});
		}
		delete(id) {
			if(this[id]) {
				this.referenceCount--;
				delete this[id];
			}
		}
		put(id) {
			this[id] || this.referenceCount++;
			this[id] = true;
		}
	}
	class Reference {
		constructor(object) {
			this.value = object;
		}
		toJSON() {
			return true;
		}
	}
	
	class Database {
		constructor(name,storage,options={futures:true}) {
			const me = this;
			this["#key"] = "#Database#" + name;
			// make these visible?
			this.keyPath = ["_","#"];
			this.options = Object.assign({},options);
			// set defaults
			options.futures===false || (this.options.futures=true);
			!options.index || (this.index = new Index());
			Object.defineProperty(this,"queries",{enumerable:false,configurable:true,writable:true,value:{}});
			Object.defineProperty(this,"sinks",{enumerable:false,configurable:true,writable:true,value:[]});
			Object.defineProperty(this,"sources",{enumerable:false,configurable:true,writable:true,value:[]});
			Object.defineProperty(this,"constructors",{enumerable:false,configurable:true,writable:true,value:{}});
			if(options.keys) {
				Object.defineProperty(this,"keys",{enumerable:false,configurable:true,writable:true,value:Object.assign({},options.keys)});
			}
			if(options.encrypt) {
				storage = new JSONStorageInterceptor(new EncryptedStorageInterceptor(storage,options.encrypt));
			} else if(!(storage instanceof LocalStore)) {
				storage = new JSONStorageInterceptor(storage);
			}
			Object.defineProperty(this,"storage",{enumerable:false,configurable:true,writable:true,value:new StorageSerializer(storage,{hidden:["_"],keyPath:this.keyPath})});
		}
		activate(data,id,done=new WeakMap()) {
			const me = this,
				type = typeof(data);
			if(!data || type!=="object") { return; }
			if(data.__activated__ || done.has(data)) { return data._["#"]; }
			done.set(data,true);
			this.register(data.constructor);
			Object.defineProperty(data,"__activated__",{enumerable:false,configurable:true,writable:true,value:true});
			const desc = Object.getOwnPropertyDescriptor(data,"_");
			if(!desc) {
				Object.defineProperty(data,"_",{enumerable:false,configurable:true,writable:true,value:{">":{},"..":{}}});
			} else if(desc.enumerable) {
				Object.defineProperty(data,"_",{enumerable:false,configurable:true,writable:true,value:desc.value});
			}
			data._[">"] || (data._[">"] = {});
			if(!data._["#"]) {
				id = this.createId(data.constructor.name,id);
				Object.defineProperty(data._,"#",{enumerable:true,configurable:false,writable:false,value:id});
			} else if(id && data._["#"]!==id) { throw new Error("Can't re-assign id"); }
			if(data instanceof Date) {
				Object.defineProperty(data,"time",{enumerable:true,configurable:true,get:function() { return this.getTime();},set:function(seconds) { this.setTime(seconds); }});
				Object.defineProperty(data,"year",{enumerable:false,configurable:true,get:function() { return this.getFullYear();},set:function(year) { this.setFullYear(year); }});
				Object.defineProperty(data,"month",{enumerable:false,configurable:true,get:function() { return this.getMonth();},set:function(month) { this.setMonth(month); }});
				Object.defineProperty(data,"date",{enumerable:false,configurable:true,get:function() { return this.getDate();},set:function(dayOfMonth) { this.setDate(dayOfMonth); }});
				Object.defineProperty(data,"day",{enumerable:false,configurable:true,get:function() { return this.getDay();},set:function(dayOfWeek) { this.setDay(dayOfWeek); }});
				Object.defineProperty(data,"hours",{enumerable:false,configurable:true,get:function() { return this.getHours();},set:function(hours) { this.setHours(hours); }});
				Object.defineProperty(data,"minutes",{enumerable:false,configurable:true,get:function() { return this.getMinutes();},set:function(minutes) { this.setMinutes(minutes); }});
				Object.defineProperty(data,"seconds",{enumerable:false,configurable:true,get:function() { return this.getSeconds();},set:function(seconds) { this.seSeconds(seconds); }});
				Object.defineProperty(data,"milliseconds",{enumerable:false,configurable:true,get:function() { return this.getMilliseconds();},set:function(milliseconds) { this.setMilliseconds(milliseconds); }});
				Object.defineProperty(data,"timezoneOffset",{enumerable:false,configurable:true,get:function() { return this.getTimezoneOffset();},set:function() {  }});
				Object.defineProperty(data,"UTCYear",{enumerable:false,configurable:true,get:function() { return this.getUTCFullYear();},set:function(year) { this.setUTCFullYear(year); }});
				Object.defineProperty(data,"UTCMonth",{enumerable:false,configurable:true,get:function() { return this.getUTCMonth();},set:function(month) { this.setUTCMonth(month); }});
				Object.defineProperty(data,"UTCDate",{enumerable:false,configurable:true,get:function() { return this.getUTCDate();},set:function(dayOfMonth) { this.setUTCDate(dayOfMonth); }});
				Object.defineProperty(data,"UTCDay",{enumerable:false,configurable:true,get:function() { return this.getUTCDay();},set:function(dayOfWeek) { this.setUTCDay(dayOfWeek); }});
				Object.defineProperty(data,"UTCHours",{enumerable:false,configurable:true,get:function() { return this.getUTCHours();},set:function(hours) { this.setUTCHours(hours); }});
				Object.defineProperty(data,"UTCMinutes",{enumerable:false,configurable:true,get:function() { return this.getUTCMinutes();},set:function(minutes) { this.setUTCMinutes(minutes); }});
				Object.defineProperty(data,"UTCSeconds",{enumerable:false,configurable:true,get:function() { return this.getUTCSeconds();},set:function(seconds) { this.seSeconds(seconds); }});
				Object.defineProperty(data,"UTCMilliseconds",{enumerable:false,configurable:true,get:function() { return this.getUTCMilliseconds();},set:function(milliseconds) { this.setUTCMilliseconds(milliseconds); }});
			}
			Object.keys(data).forEach(key => {
				me.activateKey(data,key);
			});
			return data._["#"];
		}
		activateKey(object,key) {
			const me = this,
				id = object._["#"];
			object._[">"][key] = {touched: Date.now()};
			const desc = Object.getOwnPropertyDescriptor(object,key),
				set = async function(value) {
					try {
						const isfirst = desc.value===undefined;
						if(this[key]===value) return true;
						if(desc.set) desc.set(value);
						else desc.value = value;
						if(value && typeof(value)==="object" && value!==object) {
							const child = value;
							me.activate(child);
							child._[".."][key] || (child._[".."][key] = {});
							child._[".."][key][id] || (child._[".."][key][id] = new Reference(object));
						}
						if(me.index) {
							!me.index[key] || me.index[key].delete(value,id);
							me.index[key] || (me.index[key] = new PropertyIndex());
							me.index[key].put(value,id);
						}

						isfirst || await me.patch(this,key);
					} catch(e) { console.log(e); }
						return true;
					},
				get = (desc.get ? desc.get : function() { return desc.value; });
			if(desc.configurable) Object.defineProperty(object,key,{enumerable:desc.enumerable,configurable:true,get,set});
			if(desc.value && typeof(desc.value)==="object" && desc.value!==object) {
				const child = desc.value;
				this.activate(child);
				child._[".."][key] || (child._[".."][key] = {});
				child._[".."][key][id] || (child._[".."][key][id] = new Reference(object));
			}
		}
		async count() {
			return await this.storage.count();
		}
		createId(root,id) {
			return this.storage.createId(root,id);
		}
		async get(id) {
			const object = await this.storage.get(id);
			if(object) this.activate(object);
			return object;
		}
		async load() {
			const config = await this.storage.get(this["#key"]);
			if(config) {
				Object.assign(this,config);
				return true;
			}
			this.storage.put(this);
			return false;
		}
		peer(storageProvider) {
			this.sink(storageProvider);
			this.source(storageProvider);
		}
		onError(error) {
			console.log(error);
		}
		async patch(data,key,touched) {
			touched || (touched = Date.now());
			data._[">"][key].touched = touched;
			await this.storage.put(data); // data is the patched object, so write entire thing
			const me = this,
				getpaths = async (object,paths) => {
					for(let property in object._[".."]) {
						for(let parentid in object._[".."][property]) {
							let parent = object._[".."][property][parentid].value;
							if(!parent[property] || typeof(parent[property])!=="object" || parent[property]._["#"]!==object._["#"]) {
								delete object._[".."][property][parentid];
							} else {
								await getpaths(parent,paths[property]={});
							}
						}
						if(Object.keys(object._[".."][property]).length===0) {
							delete object._[".."][property];
						}
					}
					return paths;
				},
				id = data._["#"],
				queries = this.queries;
			const paths = {};
			paths[key] = true;
			await getpaths(data,paths);
			for(let key in queries) {
				const query = queries[key];
				await query.test(data,query.pattern,paths);
			}
			for(let storageProvider of this.sinks) storageProvider.put(data); // should be patch?
		}
		async put(data,id,source,sent,now) {
			now || (now = Date.now());
			const database = this,
				type = typeof(data),
				//remotetime = (source ? await source.time() :  now),
				senttime = (sent ? sent : now);
			//if(senttime>remotetime) { // re-enable when we support peering with time checks in options flags
			//	console.log(`Rejecting data, sent time, {remotetime}, greater than remote time, {senttime}`,data);
			//	return;
			//}
			if(data && type==="object") {
				if(senttime>now) {
					if(this.options.futures) {
						//console.log("delaying sent!")
						setTimeout(() => {
							//console.log("proceeding sent!")
							database.put(data,id,source,sent);
						},senttime-now);
					} else {
						return;
					}
				}
				if(source) {
					if(!data._) {
						throw new Error("Remote object without metadata"); // should test for this earlier in call stack
					}
					const existing = await this.get(data._["#"]);
					if(existing) {
						// look through all keys, change existing or defer
						for(let key in data) {
							const value = data[key];
							if(value && typeof(value)==="object") {
								await database.put(value,id,source,sent,now);
							} else if(!existing._[">"][key] || data._[">"][key].touched > existing._[">"][key].touched) {
								if(data._[">"][key].touched>now) {
									if(this.options.futures) {
										//console.log("delaying touched!");
										setTimeout(async () => {
											//console.log("proceeding touched!");
											const future = await database.get(data._["#"]);
											if( data._[">"][key].touched > future._[">"][key].touched) {
												future[key] = value;
												database.patch(future,key,data._[">"][key].touched);
											} else if(future._[">"][key].touched === data._[">"][key].touched) {
												if(value>future[key]) {
													future[key] = value;
													database.patch(future,key,data._[">"][key].touched)
												}
											}
										});
									}
								} else {
									existing[key] = value;
									database.patch(existing,key,data._[">"][key].touched);
								}
							} else if(existing._[">"][key].touched === data._[">"][key].touched) {
								if(value>existing[key]) {
									existing[key] = value;
									database.patch(existing,key,data._[">"][key].touched)
								}
							} else {
								console.log("Ignoring old!")
							}
						}
						return;
					}
				}
				this.activate(data,id);
				await this.storage.put(data);
				!this.index || this.index.put(data);
				const sinks = this.sinks;
				for(let sink of sinks) sink.put(data);
				await this.respond(data); // limits
			}
		}
		register(constructor) {
			this.storage.register(constructor);
			return this.constructors[constructor.name] || (this.constructors[constructor.name] = constructor);
		}
		async respond(object,limits) {
			const queries = this.queries;
			for(let key in queries) {
				const query = queries[key];
				await query.test(object,query.pattern,limits);
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
		match(pattern,on,sterilize=0) {
			if(pattern && typeof(pattern)==="object") {
				const query = new Query(this,pattern,on,sterilize);
				for(let source of this.sources) {
					source.match(pattern,on);
				}
			}
		}
	}
	//Database.RemoteDatabase = RemoteDatabase;
	Database.LocalStore = LocalStore;
	Database.Query = Query;
	Database.fromJSON = function(data) {
		const instance = new Database();
		return Object.assign(instance,data);
	}
	Database.uuidv4 = uuidv4;
	Database.exposeMetadata = (data,target={},done=new Set()) => {
		if(data && typeof(data)==="object") {
			Object.keys(data).forEach((key) => {
				const value = data[key];
				if(value && typeof(value)==="object") {
					if(done.has(value)) {
						target[key] = {"#": value._["#"]};
					} else {
						done.add(value);
						exposeMetaData(value,target[key]={},done);
					}
				} else {
					target[key] = value;
				}
			});
			Object.defineProperty(target,"_",{enumerable:true,configurable:true,writable:true,value:data._});
		}
		return target;
	}
	if(typeof(module)!=="undefined") {
		module.exports = Database;
	} else {
		window.Database = Database;
	}
}).call(this);