/*
MIT License

Copyright (c) 2018 Simon Y. Blackwell, AnyWhichWay, LLC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
(function() {

//soundex from https://gist.github.com/shawndumas/1262659
const soundex = (a) => {a=(a+"").toLowerCase().split("");var c=a.shift(),b="",d={a:"",e:"",i:"",o:"",u:"",b:1,f:1,p:1,v:1,c:2,g:2,j:2,k:2,q:2,s:2,x:2,z:2,d:3,t:3,l:4,m:5,n:5,r:6},b=c+a.map(function(a){return d[a]}).filter(function(a,b,e){return 0===b?a!==d[c]:a!==e[b-1]}).join("");return(b+"000").slice(0,4).toUpperCase()};

// from https://gist.github.com/lovasoa/3361645 + length==1 mod by AnyWhichWay
function intersection(){if(arguments.length===0) return []; if(arguments.length===1) return arguments[0]; var a,b,c,d,e,f,g=[],h={},i;i=arguments.length-1;d=arguments[0].length;c=0;for(a=0;a<=i;a++){e=arguments[a].length;if(e<d){c=a;d=e}}for(a=0;a<=i;a++){e=a===c?0:a||c;f=arguments[e].length;for(var j=0;j<f;j++){var k=arguments[e][j];if(h[k]===a-1){if(a===i){g.push(k);h[k]=0}else{h[k]=a}}else if(a===0){h[k]=0}}}return g}


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

const compile = string => {
		if(typeof(string)!=="string" || string.indexOf("(")===-1) return string;
		//if(string[0]==="\\") string = string.substring(1)
		try {
			const value = new Function("return " + string).call(null);
			if(typeof(value)!=="function" && value!==string) return string;
			return value;
		} catch(err) {
			return string;
		}
	},
	compilePath = path => {
		return path.map(part => {
			return typeof(part)==="string" && (part.indexOf("function")>=0 || part.indexOf("=>")>=0) ? compile(toValue(part)) : toValue(part);
		});
	},
	compileInlineArg = value => {
		if(value==="") return value;
		try {
			return Function(""+testvalue)(); //eval(testvalue);
		} catch(e) {
			return value;
		}
	},
	// based on https://github.com/epoberezkin/fast-deep-equa
	deepEqual = (a, b, depth=Infinity) => {
	  if (a === b) return true;

	  const arrA = Array.isArray(a),
	    arrB = Array.isArray(b);

	  if (arrA && arrB) {
	    if (a.length != b.length) return false;
	    for (let i = 0; i < length; i++)
	      if (!deepEqual(a[i], b[i],depth)) return false;
	    return true;
	  }

	  if (arrA != arrB) return false;

	  const dateA = a instanceof Date,
	    dateB = b instanceof Date;
	  if (dateA != dateB) return false;
	  if (dateA && dateB) return a.getTime() === b.getTime();

	  const regexpA = a instanceof RegExp,
	    regexpB = b instanceof RegExp;
	  if (regexpA != regexpB) return false;
	  if (regexpA && regexpB) return a.toString() === b.toString();

	  if (a instanceof Object && b instanceof Object) {
	  	if(depth===0) return true;
	    const keys = Object.keys(a),
	    	length = keys.length;
	    if (length !== Object.keys(b).length)
	      return false;

	    for (let i = 0; i < length; i++)
	      if (b[keys[i]]===undefined) return false;

	    for (let i = 0; i < length; i++) {
	      const key = keys[i];
	      if (!deepEqual(a[key], b[key],--depth)) return false;
	    }

	    return true;
	  }
	  return false;
	},
	defaultIdGenerator = object => object instanceof Date ? `Date@${object.getTime()}` : `${object.constructor.name}@${uuidv4()}`,
	normalizePathOrPattern = (pathOrPattern,getIds) => {
		if(typeof(pathOrPattern)==="string") {
			const path = pathOrPattern.split("/");
			if(path.length===1) {
				path.push("#");
				path.push("*");
			}
			if(!getIds) path.push("*");
			return path;
		}
		return pathOrPattern;
	},
	parseId = string => {
		const parts = [];
		if(typeof(string)!=="string") return;
		for(let i=0;i<128;i++) {
			if(string[i]==="@") {
				parts[0] = string.substring(0,i);
				parts[1] = string.substring(i+1);
				break;
			}
		}
		if(parts.length==2) {
			if(parts[0]==="Date") {
				parts[1] = parseInt(parts[1]);
				return parts;
			}
			if(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(parts[1]) && /^[$A-Z_][0-9A-Z_$]*$/i.test(parts[0])) return parts;
		}
	},
	toValue = value => {
		if(typeof(value)==="string") {
			if(value[0]==='"' && value[value.length-1]==='"') return value;
			if(value[0]==="'" && value[value.length-1]==="'") return '"' + value.substring(1,value.length-1) + '"';
		}
		try {
			return JSON.parse(value);
		} catch(e) {
			return value;
		}
	},
	toEdgeValue = value => typeof(value)==="string" && !parseId(value) && value!=="*" ? JSON.stringify(value) : value && typeof(value)==="object" ? value["#"] : typeof(value)==="function" ? value+"" : value;

async function* cartesian(head, ...tail) {
  const remaining = tail.length > 0 ? cartesian(...tail) : [[]];
  for await (let r of remaining) { for await (let h of head) { const result = [h, ...r]; if(!result.includes(undefined)) yield result; } };
}

async function* pipe(functions,arg=null,recursing) {
	if(!pipe.recursing) pipe.END = false;
	let next = functions[0];
	if(!next || pipe.END) return;
	if(Object.getPrototypeOf(next).constructor===Object.getPrototypeOf(function(){}).constructor) {
		const value = next(arg);
		if(value!==undefined) {
			if(functions.length===1) yield value;
			else {
				functions.shift();
				yield*  await pipe(functions,value,true);
			}
		}
	} else if(Object.getPrototypeOf(next).constructor===Object.getPrototypeOf(async function(){}).constructor) {
		const value = await next(arg);
		if(value!==undefined) {
			if(functions.length===1) yield value;
			else {
				functions.shift();
				yield* await pipe(functions,value,true);
			}
		}
	} else if(Object.getPrototypeOf(next).constructor===Object.getPrototypeOf(function*(){}).constructor) {
		functions.shift();
		for await (let value of next(arg)) {
			if(value!==undefined) {
				if(functions.length===0) yield value; 
				else yield* await pipe(functions,value,true);
			}
			if(pipe.END) return;
		}
	} else if(Object.getPrototypeOf(next).constructor===Object.getPrototypeOf(async function*(){}).constructor) {
		functions.shift();
		for await (let value of await next(arg)) {
			if(value!==undefined) {
				if(functions.length===0) yield value;
				else yield* await pipe(functions,value,true);
			}
			if(pipe.END) return;
		}
	} else {
		throw new TypeError("Unsupported function type passed to pipe")
	}
	return;
}

class Metadata {
	constructor(subject) {
		if(!subject["#"]) subject["#"] = defaultIdGenerator(subject);
		this.created = new Date();
		this.subject = subject["#"];
		this["#"] = defaultIdGenerator(this);
	}
}
function Trigger(pattern,persist) {
	const object = Object.assign(Object.create(Object.getPrototypeOf(pattern)),pattern);
	if(!persist) {
		Object.defineProperty(object,"ephemeral",{enumerable:false,configurable:true,writable:true,value:true})
	}
	object["#"] = defaultIdGenerator(object);
	Object.defineProperty(object,"partition",{enumerable:false,configurable:true,writable:true,value:"triggers"});
	return object;
}
class Query {
	constructor(database,partition="data") {
		this.command = [];
		this.database = database;
		this.partition = partition;
	}
	async all() {
		if(this.results) return this.results;
		for(let command of this.command) {
			if(command.name==="collect") this.command = command(this.command);
		}
		this.results = [];
		for await (let item of await pipe(this.command)) {
			this.results.push(item);
		}
		return this.results;
	}
	assign(object) {
		this.command.push(data => Object.assign(data,object));
		return this;
	}
	concat(...values) {
		this.collect();
		this.command.push(function*(data) {
			for(let item of data) yield item;
			for(let item of values) yield item;
		});
		return this;
	}
	collect() {
		const length = this.command.length;
		this.command.push(function collect(command) {
			const collector = command.slice(0,length);
			return [
				async function*() {
					const collection = [];
					for await (let item of pipe(collector)) {
						collection.push(item);
					}
					yield collection;
				}
			].concat(command.slice(length+1));
		});
		return this;
	}
	default(object) {
		this.command.push(data => { for(let key in object) { if(data[key]===undefined) data[key] = object[key]; }; return data; });
		return this;
	}
	delete(pathOrPatternOrId,ctor = pathOrPatternOrId && typeof(pathOrPatternOrId)==="object" ? pathOrPatternOrId.instanceof : undefined) {
		if(ctor) {
			if(typeof(ctor)==="string") {
				ctor = this.database.constructors[ctor];
			}
			pathOrPatternOrId = Object.assign(Object.create(ctor.prototype),pathOrPatternOrId);
			delete pathOrPatternOrId.instanceof;
		}
		if(pathOrPatternOrId && typeof(pathOrPatternOrId)==="object") {
			Object.defineProperty(pathOrPatternOrId,"isPattern",{enumerable:false,configurable:true,writable:true,value:true})
		}
		this.command.push(data =>
			this.database[this.partition].delete(pathOrPatternOrId||data)
		);
		return this;
	}
	async exec() {
		for(let command of this.command) {
			if(command.name==="collect") this.command = command(this.command);
		}
		for await (let item of await pipe(this.command)) { ; }
	}
	every(f) {
		this.collect();
		this.command.push(data => 
			data.every(f) ? data : undefined
		);
		return this;
	}
	fetch(url,options,done) {
		if(arguments.length) {
			this.command.push(async ({url,options,done}) => { if(done) return done(await fetch(url,options)); fetch(url,options); return data; });
		} else if(done) {
			this.command.push(async data => { const config = Object.assign({},options); config.body = JSON.stringify(data); return done(await fetch(url,options)) });
		} else {
			this.command.push(data => { const config = Object.assign({},options); config.body = JSON.stringify(data); fetch(url,options); return data; });
		}
		return this;
	}
	filter(f) {
		this.command.push(data => 
			f(data) ? data : undefined
		);
		return this;
	}
	first(n=1) {
		let count = 0;
		this.command.push(function*(data) {
			if(count<n) {
				if(count===n-1) {
					pipe.END = true;
				}
				count++;
				yield data;
			}
		});
		return this;
	}
	forEach(f) {
		let i = 0;
		this.command.push(data => { f(data,i++); return data;} );
		return this;
	}
	fork(...queries) {
		this.collect();
		for(let query of queries) {
			const fork = this.database.query();
			query.call(fork);
			this.command.push(value => { 
				fork.provide(...value.map(value => value && typeof(value)==="object" ? Object.assign({},value) : value)); // need to handle arrays
				const provide = fork.command.pop();
				fork.command.unshift(provide);
				fork.all();
				return value; });
		}
		this.yield();
		return this;
	}
	get(pathOrPattern,edgeOnly,ctor = pathOrPattern ? pathOrPattern.instanceof : undefined) {
		const edge = this.database[this.partition];
		if(ctor) {
			if(typeof(ctor)==="string") {
				ctor = this.database.constructors[ctor];
			}
			pathOrPattern = Object.assign(Object.create(ctor.prototype),pathOrPattern);
			delete pathOrPattern.instanceof;
		}
		if(pathOrPattern && typeof(pathOrPattern)==="object") {
			Object.defineProperty(pathOrPattern,"isPattern",{enumerable:false,configurable:true,writable:true,value:true})
		}
		this.command.push(async function*() { for await (let next of edge.get(normalizePathOrPattern(pathOrPattern),edgeOnly,false,edgeOnly)) yield next; });
		return this;
	}
	join(...pathsOrPatternsAndTest) {
		const database = this.database,
			edge = this.database[this.partition],
			test = pathsOrPatternsAndTest.pop(),
			pathsOrPatterns = pathsOrPatternsAndTest.map(pathOrPattern => normalizePathOrPattern(pathOrPattern)),
			generators = []; // need to hanmdle short path! see above get
		for(let pathOrPattern of pathsOrPatterns) {
			generators.push(async function*() { for await (let next of edge.get(pathOrPattern)) yield next; }());
		}
		this.command.push(async function*() { for await (let next of cartesian.apply(null,generators)) if(test(next)) yield next; });
		return this;
	}
	keys() {
		this.command.push(function*(data) {
			if(data && typeof(data)==="object") {
				for(let key of Object.keys(data)) yield key;
			}
		});
		return this;
	}
	last(n=1) {
		this.collect();
		this.command.push(function*(data) {
			const items = data.slice(-n);
			for(let item of items) yield item;
		});
		return this;
	}
	map(f) {
		let i = 0;
		this.command.push(data => f(data,i++));
		return this;
	}
	mapReduce(map,reduce) {
		this.command.push(async function*(data) {
			for(let value of map(data)) {
				const pair = await value,
					key = Object.keys(pair)[0],
					value = pair[key]; 
				if(Array.isArray(value)) {
					for(let item of value) {
						yield {[key]:item};
					}
				} else {
					yield pair;
				}
			}
		})
		return this;
	}
	merge(query,where,copy) {
		this.command.push(async function*(data) {
			const values = await query.all(),
				record = (Array.isArray(data) ? data : data!==undefined ? [data] : []);
			for(let value of values) {
				if(!where || where(record)) yield (copy ? record.slice() : record);
			}
		});
		return this;
	}
	on(pattern,eventName,callback,persist) {
		const root = this.database.triggers,
			trigger = Trigger(pattern,persist);
		this.command.push(async (data) => {
			trigger[`on${eventName}`] = callback; 
			await root.put(trigger);
			return trigger;
		});
		return this;
	}
	pop(f) {
		this.collect();
		this.command.push(function*(data) {
			if(f) f(data.pop())
			else data.pop();
			for(let item of data) yield item;
		});
		return this;
	}
	provide(...array) {
		this.command.push(function*() { for(let item of array) yield item; });
		return this;
	}
	push(value) {
		this.collect();
		this.command.push(function*(data) {
			for(let item of slice) yield item;
			yield value;
		});
		return this;
	}
	put(data,expires,skip) {
		const root = this.database.data;
		this.command.push(async function(value) { await root.put(data,expires); if(!skip) { if(value===undefined) { value = [] } else if(!Array.isArray(value)) { value = [value]; } value.push(data); } return value; });
		return this;
	}
	random(portion) {
		let last;
		this.command.push(function(data) {
			if(Math.random()<=portion) return data;
		});
		return this;
	}
	reduce(f,initial) {
		this.collect();
		this.command.push(data => data.reduce(f,initial));
		return this;
	}
	reduceRight(f,initial) {
		this.collect();
		this.command.push(data => data.reduceRight(f,initial));
		return this;
	}
	render(template) {
		this.command.push(data => { return {value:data,string:Function("data","with(data) { return `" + template + "`}")(data)}})
		return this;
	}
	reset() {
		delete this.results();
	}
	reverse() {
		this.collect();
		this.command.push(function*(data) { 
			const reversed = data.reverse();
			for(let item of reversed) yield item;
		});
		return this;
	}
	secure(path,security) {
		const root = this.database.security,
			parts = Array.isArray(path) ? path.slice() : path.split("/");
		parts.forEach((part,i) => { parts[i]="\\"+part; });
		this.command.push(async function*(edge) {
			for await (let next of root.get(parts,true,undefined,true)) {
				next.value = security;
				//await next.save();
				next.save();
			}
			yield edge||root;
		});
		return this;
	}
	seen(f) {
		const seen = [];
		this.command.push(data => { 
			if(!seen.includes(data)) {
				seen.push(data);
				f(data);
			}
		});
	}
	slice(begin,end) {
		if(begin<0 || end<0) {
			this.collect();
			this.command.push(function*(data) {
				const sliced = data.slice(begin,end);
				for(let item of sliced) yield item;
			});
		} else {
			this.command.push(function*(data) { 
				if(begin===0) {
					if(end>0) {
						yield data;
						end--
					}
					return;
				}
				yield undefined;
				begin--;
			});
		}
		return this;
	}
	shift(f) {
		this.collect();
		this.command.push(function*(data) {
			if(f) f(data.shift())
			else data.shift();
			for(let item of data) yield item;
		});
		return this;
	}
	some(f) {
		this.collect();
		this.command.push(function*(data) { 
			if(data.some(f)) {
				for(let item of data) yield item;
			}
		});
		return this;
	}
	sort(f) {
		this.collect();
		this.command.push(function*(data) { 
			const sorted = data.sort(f);
			for(let item of sorted) yield item;
		});
		return this;
	}
	splice(start,deleteCount,...items) {
		let count = 0;
		if(start<0) {
			this.collect();
			this.command.push(function*(data) { 
				data.splice(start,deleteCount,...items);
				for(let item of data) yield item;
			});
		} else {
			this.command.push(function*(data) {
				if(count<start) {
					yield data;
					count++;
				} else {
					for(let item of items) yield item;
					if(!deleteCount) {
						yield data;
					} else if(count>start+deleteCount) {
						yield data;
					}
					count++;
				}
			});
		}
		return this;
	}
	// spliceEvery
	unique() {
		const seen = [];
		this.collect();
		this.command.push(function*(data) {
			for(let item of data) {
				if(!seen.includes(item)) yield item;
				seen.push(item);
			}
		});
		return this;
	}
	unshift(value) {
		this.command.push(function* f(data) { 
			if(!f.once) { f.once = true; yield value; }
			yield data;
		});
		return this;
	}
	values() {
		this.command.push(function*(data) {
			if(data && typeof(data)==="object") {
				for(let value of Object.values(data)) yield value;
			}
		});
		return this;
	}
	when(test,f) {
		this.command.push(function(data) {
			if(test(data)) f(data)
			return data;
		});
		return this;
	}
	yield() {
		this.command.push(async function*(data) { for(let item of data) yield item; });
		return this;
	}
}


class Database {
	constructor(storage,options) {
		class Graph {
			constructor(path="",value,putOrExpires) {
				const key = typeof(path)==="string" ? path : path.join("/"),
						parts = key.split("/"),
						idparts = parseId(parts.pop());
				if(idparts) {
					let [classname,id] = idparts;
					if(classname==="Date") value = new Date(id);
				}
				this.key = key; // use to load from a key value store as prefix
				this.edges = {};
				if(value!==undefined) this.value = value;
				const loaded = new Promise(async resolve => {
					let create = false,
						action;
					const item = await storage.getItem(this.key);
					if(item) {
						action = "updated";
						Object.assign(this,JSON.parse(item));
						if(this.value)  {
							this.value = await database.deserialize(this.value);
						}
					} else {
						create = true;
						action = "created";
					}
					if(putOrExpires || create) {
						if(this.value && typeof(this.value)==="object" && !(this.value instanceof Metadata) && !(this.value instanceof Date)) {
							await storage.setItem(key,JSON.stringify(this));
						} else {
							await storage.setItem(key,JSON.stringify(this));
						}
					}
					resolve(true);
				});
				Object.defineProperty(this,"loaded",{enumerable:false,configurable:false,writable:true,value:loaded});
			}
			atomize(object,idGenerator=defaultIdGenerator) { // move to db
				let	atoms = [],
					id = object["#"];
				if(!id) id = object["#"] = idGenerator(object);
				database.validate(object);
				const ctor = object.constructor,
					classname = ctor.name;
				if(!database.constructors[classname]) database.constructors[classname] = ctor;
				if(object instanceof Date) {
					atoms.push([ctor,id,"month",object.getUTCMonth()]);
					atoms.push([ctor,id,"date",object.getUTCDate()]);
					atoms.push([ctor,id,"day",object.getUTCDay()]);
					atoms.push([ctor,id,"hours",object.getUTCHours()]);
					atoms.push([ctor,id,"minutes",object.getUTCMinutes()]);
					atoms.push([ctor,id,"seconds",object.getUTCSeconds()]);
					atoms.push([ctor,id,"milliseconds",object.getUTCMilliseconds()])
					atoms.push([ctor,id,"year",object.getUTCFullYear()]);
				}
				for(let key in object) {
					let value = object[key],
						type = typeof(value);
					if(value && type==="object" && value.constructor!==Object) {
						const children = this.atomize(value,idGenerator);
						atoms = atoms.concat(children);
						atoms.push([value.constructor,"..",value["#"],id]);
					}
					if(value!==undefined){
						atoms.push([ctor,id,key,value]);
					}
				}
				return atoms;
			}
			toJSON() {
				const value = database.serialize(this.value), //database.serialize(this.value), //(typeof(this.value)==="function" ? this.value+"" : this.value), //
					json = {value,"^":database.serialize(this["^"])};
				for(let key1 in this.edges) {
					if(!json.edges) json.edges = {};
					const edge1 = this.edges[key1];
					json.edges[key1] = {};
					if(edge1 && edge1.edges) {
						for(let key2 in edge1.edges) {
							if(!json.edges[key1].edges) json.edges[key1].edges = {};
							const edge2 = edge1.edges[key2];
							if(edge2 && edge2.edges) {
								for(let key3 in edge2.edges) {
									if(!json.edges[key1].edges[key2]) json.edges[key1].edges[key2] = {};
								}
							}
						}
					}
					
				}
				return json;
			}
				async delete(pathOrPatternOrId) {
					const type = typeof(pathOrPatternOrId);
					let target = pathOrPatternOrId;
					if(type==="string") {
						target = Object.assign({},await database.getObject(pathOrPatternOrId));
						Object.defineProperty(target,"isPattern",{enumerable:false,configurable:true,writable:true,value:true});
					}
					if(typeof(target)==="object" && !Array.isArray(target)) {
					let deleted,
						next;
					const source = (type==="string" ? [target] : this.find(target));
					for await (let object of source) {
						const id = object["#"],
							classname = parseId(id)[0],
							edge = database.data.edges[classname].edges[id];
						await database.storage.removeItem(edge.key);
						for(let key in object) {
							const value = object[key],
								evalue = toEdgeValue(value),
								vedge = database.data.edges[classname].edges[key].edges[evalue];
							if(key==="^") await this.delete(value["#"]);
							if(vedge) {
								delete vedge.edges[id];
								if(Object.keys(vedge.edges).length===0) { // implement running key counts to speed this up
									await database.storage.removeItem(vedge.key);
									delete database.data.edges[classname].edges[key].edges[evalue];
									const kedge = database.data.edges[classname].edges[key];
									if(Object.keys(kedge.edges).length===0) {
										await database.storage.removeItem(edge.key);
										delete database.data.edges[classname].edges[key];
									} else {
										await kedge.save();
									}
								} else {
									await vedge.save();
								}
							}
						}
						delete database.data.edges[classname].edges[id];
						await database.data.edges[classname].save();
						this.handle("delete",object);
						deleted = true;
					}
					if(deleted) {
						await database.data.save();
					}
					return;
				} 
				let deleted,
					next;
				for await (let edge of database.data.get(pathOrPattern,false)) {
					await edge.loaded;
					await edge.delete();
				}
				const id = pathOrPattern.pop();
				for await (let edge of database.data.get(pathOrPattern,false)) {
					if(edge.edges[id]) {
						delete edge.edges[id];
						await edge.save();
					}
				}
				const value = pathOrPattern.pop();
				for await (let edge of database.data.get(pathOrPattern,false)) {
					if(edge.edges[value]) {
						edge.edges[value].edges = {};
						await edge.edges[value].save();
						delete edge.edges[value];
						await edge.save();
					}
				}
				if(deleted) await this.save();
				return;
			}
			async* find(pattern,create,edgeOnly,all) {
				await this.loaded;
				const sets = [],
					atoms = await this.atomize(pattern,() => "*",create);
				for(let [ctor,id,key,value] of atoms) {
					if(!all && key==="#" && value==="*") continue; //avoid matching all objects!
					if(edgeOnly && id==="..") continue; // avoid matching parent object
					const set = [],
						generator = this.get([ctor.name,key,(value==="*" ? value : toEdgeValue(value)),id],create,false,true);
					for await (let edge of generator) {
						set.push(edge.key.split("/").pop()) // get the object id
					}
					sets.push(set);
				}
				const results = intersection(...sets);
				if(edgeOnly) {
					const classname = pattern.constructor.name;
					for(let edgename of results) {
						yield database.data.edges[classname].edges[edgename];
					}
				} else {
					for(let id of results) {
						const [classname,uuid] = parseId(id);
						yield database.data.edges[classname].edges[id].value;
					}
				}
				return;
			}
			async* get(pathOrPattern="",create,put,edgeOnly,partition="data") {
				if(pathOrPattern==="") {
					yield this;
					return;
				}
				if(typeof(pathOrPattern)==="function") {
					yield pathOrPattern();
					return;
				}
				if(typeof(pathOrPattern)==="object" && !Array.isArray(pathOrPattern)) return yield* this.find(pathOrPattern,true,edgeOnly);
				await this.loaded;
				let parts = Array.isArray(pathOrPattern) ? pathOrPattern : pathOrPattern.split("/");
				if(database.options.inline) parts = compilePath(parts);
				let edge;
				if(parts.length===0) {
						if(edgeOnly) {
							yield this
						}	else {
							const value = this.value,
								type = typeof(value);
							if(type==="string") {
								const idparts = parseId(value);
								if(idparts) {
									if(idparts[0]==="Date") yield new Date(idparts[1]);
									else yield await database.getObject(value,partition);
								} else {
									yield value; // toValue(value)
								}
							} else if(type==="object" && value["#"]) {
								yield await database.getObject(value["#"],partition);
							} else {
								yield value; // toValue(value);
							}
						}
				} else {
					let key = parts.shift();
					const type = typeof(key);
					if(type==="string") {
						if(key==="..") {
							const parts = this.key.split("/");
							parts.shift();
							const child = database.getEdge(parts,partition);
							for(let id in child.edges) {
								let edge = child.edges[id];
								if(!edge || !edge.loaded) {
									const classname = parseId(id)[0];
									edge = child.edges[id] = new Graph(`${database[partition].key}/${classname}/${id}`);
								}
								await edge.loaded;
								yield edge.value;
							}
							return;
						} else if(key[0]===".") {
							let property = key.substring(1),
								testvalue;
							if(key.indexOf("(")>=0) {
								property = key.substring(1,key.indexOf("("));
								testvalue = toValue(key.substring(key.indexOf("(")+1,key.indexOf(")")));
								testvalue = (testvalue==="" ? undefined : testvalue);
								if(testvalue!==undefined && database.options.inline) {
									testvalue = compileInlineArg(testvalue);
								}
							}
							const parts = this.key.split("/");
							parts.shift();
							parts.pop();
							const edge = database.getEdge(parts,partition);
							let idparts;
							for(let value in edge.edges) {
								if(value.indexOf("Date@")===0) {
									const scope = new Date(parseInt(value.split("@")[1])),
										test = scope[property];
									if(typeof(test)==="function") {
										const result = testvalue===undefined ? test.call(scope) : test.call(scope,testvalue);
										yield this.match(parts.slice(1),result);
									} else if(test!==undefined){
										yield this.match(parts.slice(1),test);
									}
								} else if((idparts=parseId(value))) {
									const classname = idparts[0];
									if(database.data.edges[classname]) {
										let edge = database.data.edges[classname].edges[value];
										if(!edge || !edge.loaded) {
											edge = this.edges[value] = new Graph(`${database.data.key}/${classname}/${value}`);
										}
										await edge.loaded;
										const scope = edge.value;
										if(scope!=null) {
											const test = scope[property];
											if(typeof(test)==="function") {
												const result = testvalue===undefined ? test.call(scope) : test.call(scope,testvalue);
												yield this.match(parts.slice(1),result);
											} else if(test!==undefined){
												yield this.match(parts.slice(1),test);
											}
										}
									}
								} else {
									const scope = toValue(value);
									if(scope!=null) {
										const test = scope[property];
										if(typeof(test)==="function") {
											const result = testvalue===undefined ? test() : test(testvalue);
											yield this.match(parts.slice(1),result);
										} else if(test!==undefined){
											yield this.match(parts.slice(1),test);
										}
									}
									
								}
							}
							return;
						} else if(key.indexOf("(")>=0) {
							const fname = key.substring(key[0]==="\\" ? 1 : 0,key.indexOf("(")); // switch to RegExp
							const test = database.tests[fname];
							if(test) {
								let testvalue =  toValue(key.substring(key.indexOf("(")+1,key.indexOf(")")));
								if(database.options.inline) testvalue = compileInlineArg(testvalue);
								for(let value in this.edges) {
									let totest = (parseId(value) ? await database.getObject(value) : toValue(value));
									if(typeof(testvalue)==="string" && typeof(totest)==="object") totest += "";
									if(test(testvalue)(totest)) {
										if(!this.edges[value].loaded) {
											this.edges[value] = new Graph(`${this.key}/${value}`,toValue(value),put);
											await this.edges[value].loaded;
										}
										yield* await this.edges[value].get(parts.slice(),create,put,edgeOnly,partition);
									}
								}
								return;
							}
						}
					} // don't put an else here, needs to fall through
					if(type==="function") {
						try {
							const test = key;
							for(let value in this.edges) {
								let totest = (parseId(value) ? await database.getObject(value,partition) : toValue(value));
								if(test(totest)) { // !==undefined
									if(!this.edges[value].loaded) {
										this.edges[value] = new Graph(`${this.key}/${value}`,toValue(value),put);
										await this.edges[value].loaded;
									}
									yield* await this.edges[value].get(parts.slice(),create,put,edgeOnly,partition);
								}
							}
						} catch(e) {
							true;
						}
					} else if(key[0]==="*") {
						let some;
						for(let value in this.edges) {
							some = true;
							if(!this.edges[value].loaded) {
								this.edges[value] = new Graph(`${this.key}/${value}`,toValue(value),put);
								await this.edges[value].loaded;
								if(create && !put) await this.save();
							}
							if(key[1]==="(") {
								const valuestr = key.substring(2,key.indexOf(")")),
									testvalue = (valuestr.length>0 ? toValue(valuestr) : undefined),
									f = compile(value);
								if(typeof(f)!=="function") continue;
								if(testvalue===undefined ? f() : f(testvalue)) {
									yield* await this.edges[value].get(parts.slice(),create,put,edgeOnly,partition);
								}
							} else {
								yield* await this.edges[value].get(parts.slice(),create,put,edgeOnly,partition);
							}
						}
						if(!some && edgeOnly && parts.length===1) yield this;
					} else {
						edge = this.edges[key];
						if(!edge && !create) return;
						if(!edge || !edge.loaded) {
							edge = this.edges[key]  = new Graph(`${this.key}/${key}`,toValue(key),put);
						}
						await edge.loaded;
						let keyparts;
						if((keyparts=parseId(key))) {
							const classname = keyparts[0];
							edge = edge.edges[key] = database[partition].edges[classname].edges[key];
							if(!edge) {
								edge = edge.edges[key] = database[partition].edges[classname].edges[key] = database.data.edges[key] = new Graph(`${database[partition].key}/${key}`,toValue(key),put);
							}
							await edge.loaded;
							edge.value || (edge.value = {});
							if(this.match(parts,edge.value,create)) yield edge;
							return;
						}
						if(edge) {
							yield* await edge.get(parts.slice(),create,put,edgeOnly,partition);
						}
					}
				}
			}
			getParent(partition="data") {
				const path = this.key.split("/");
				path.shift(); // remove root reference
				path.pop(); // remove self reference
				return database.getEdge(path,partition);
			}
			async handle(event,data) {
				const etype = `on${event}`;
				if(!(data instanceof Trigger)) {
					const sets = [],
						triggers = {};
					for(let key in data) {
						const value = data[key],
							type = typeof(value);
						if((!value && type==="object") || type==="function") continue;
						const set = [];
						for await (let trigger of database.triggers.get([data.constructor.name,key,`*(${toEdgeValue(value)})`,"*"],false,false,false,"triggers")) {
							const id = trigger["#"];
							set.push(id);
							triggers[id] = trigger;
						}
						if(set.length>0) sets.push(set)
					}
					const ids = intersection(...sets);
					for(let id of ids) {
						const trigger = triggers[id];
						if(trigger[etype]) {
							trigger[etype]({type:event,target:data});
						}
					}
				}
			}
			match(path,object,create) {
				let node = object,
					key;
				while((key = path.shift())) {
					const value = toValue(path.shift());
					if(value===undefined) return node;
					if(node[key]!==value) return; // add function testing
					if(node[key]===undefined) {
						if(!create) return;
						node[key] = {};
					}
					node = node[key];
				}
				return node;
			}
			async patch(data,object) {
				// should do recursive check to make sure there ar echanged
				if(!data["#"] && (!object || !object["#"])) throw TypeError("Can't patch object that lacks an id");
				if(object) data["#"] = object["#"];
				if(!object) object = await database.getObject(data["#"]);
				if(!object) return this.put(data);
				await this.loaded;
				const type = typeof(data),
					patches = [],
					puts = [];
				if(data && type==="object") {
					const atoms = await this.atomize(data,false),
						ids = [];
					for(let [id] of atoms) {
						if(id && !ids.includes(id)) ids.push(id);
					}
					for(let id of ids) {
						let edge = database.data.edges[id],
							object = edge.value;
						if(object) {
							for(let okey in object) {
								for(let i=0;i<atoms.length;i++) {
									const atom = atoms[i];
									if(!atom) continue;
									const value = toEdgeValue(atom[2]),
										newvalue = atom[2];
									if(atom[0]===id) {
										let key, oldvalue;
										if(!object[atom[1]]) {
											atoms[i] = null;
											key = atom[1];
										} else if(atom[1]===okey) {
											key = okey;
											oldvalue = object[okey];
										} else {
											continue;
										}
										if(typeof(newvalue)!=="undefined") {
											if(!database.data.edges[key] || !database.data.edges[key].loaded) {
												database.data.edges[key] = new Graph(`${database.data.key}/${key}`,key,key);
												await database.data.edges[key].loaded;
											}
											if(!database.data.edges[key].edges[value] || !database.data.edges[key].edges[value].loaded) {
												database.data.edges[key].edges[value] = new Graph(`${database.data.edges[key].key}/${value}`,newvalue,newvalue);
												await database.data.edges[key].edges[value].loaded;
											}
										}
										if(oldvalue!==undefined && oldvalue!==newvalue) {
											const value = toEdgeValue(oldvalue);
											if(database.data.edges[key].edges[value].edges[id]) {
												patches.push({edge:database.data.edges[key],oldvalue,newvalue,object});
												delete database.data.edges[key].edges[value].edges[id];
												if(Object.keys(database.data.edges[key].edges[value].edges).length===0) delete database.data.edges[key].edges[value];
											}
										}
										if(object[atom[1]]) break;
									}
								}
							}
						}
					}
					Object.assign(database.data.edges[object["#"]].value,data);
					await database.data.edges[object["#"]].save();
				} else {
					const value = toValue(data);
					this.edges = {}; // should we add delete handling
					this.edges[value] = new Graph(`${this.key}/${value}`,data);
					patches.push({edge:this,data});
					await this.save();
				}
			}
			async put(data,durationOrDate) {	
				await this.loaded;
				const type = typeof(data),
					partition = data.partition || "data";
				if(data && type==="object") {
					const save = !data.ephemeral;
					let metadata = data["^"];
					if(!metadata) {
						metadata = data["^"] = new Metadata(data);
					}
					metadata.updated = new Date();
					if(durationOrDate && typeof(durationOrDate)==="object" && durationOrDate instanceof Date) {
						metadata.expires = durationOrDate;
					} else if(typeof(durationOrDate)==="number") {
						metadata.duration = durationOrDate;
						metadata.expires = new Date((metadata.updated || metadata.created) + 	metadata.duration);
					} else if(metadata.duration) {
						metadata.expires = new Date((metadata.updated || metadata.created) + 	metadata.duration);
					}
					const atoms = this.atomize(data);
					// if we put transaction ids in the metadata of all objects we could null them out after indexing, then we could have a transaction registry to look these up and if not nulled re-index
					const seen = {},
						uatoms = [],
						promises = [];
					for(let [ctor,id,key,value] of atoms) {
						const classname = ctor.name,
							type = typeof(value),
							unique = `${classname}${id}${key}`;
						if(seen[unique]) continue;
						seen[unique] = true;
						uatoms.push([ctor,id,key,value]);
						let edge = database[partition].edges[classname];
						if(!edge || !edge.loaded) edge = database[partition].edges[classname] = new Graph(`${database[partition].key}/${classname}`,ctor===Date ? (...args) => new Date(...args) : ctor===Object ? () => new Object() : ctor,save);
						promises.push(edge.loaded);
						if(value && typeof(value)==="object") {
							if(!database[partition].edges[value.constructor.name].edges[value["#"]]) {
								database[partition].edges[value.constructor.name].edges[value["#"]] = new Graph(`${database[partition].key}/${value.constructor.name}/${value["#"]}`,value,save);
								promises.push(database[partition].edges[value.constructor.name].edges[value["#"]].loaded);
								promises.push(database[partition].edges[value.constructor.name].save());
							} else {
								// patch?
							}
						}
					}
					// should not this be first to save the data as soon as possible after class creation if necesdsary
					database[partition].edges[data.constructor.name].edges[data["#"]] = new Graph(`${database[partition].key}/${data.constructor.name}/${data["#"]}`,data,durationOrDate||save);
					promises.push(database[partition].edges[data.constructor.name].edges[data["#"]].loaded);
					await database[partition].edges[data.constructor.name].save();
					for(let [ctor,id,key,value] of uatoms) {
						if(value && typeof(value)==="object") {
							if(!value["#"]) continue;
							value = value["#"];
						}
							const classname = ctor.name;
							let edge = database[partition].edges[classname];
								if(id==="..") {
									const parentclass = parseId(value)[0];
									edge = database[partition].edges[classname].edges[key];
									if(!edge || !edge.loaded) {
										edge = database[partition].edges[classname].edges[key] = new Graph(`${database[partition].key}/${classname}/${key}`,key,save);
										promises.push(await database[partition].edges[classname].save());
									}
									promises.push(edge.loaded);
									edge.edges[value] = database[partition].edges[parentclass].edges[value];
									promises.push(edge.save());
								} else {
									edge = edge.edges[key];
									if(!edge || !edge.loaded) {
										edge = database[partition].edges[classname].edges[key] = new Graph(`${database[partition].key}/${classname}/${key}`,key,save);
										promises.push(database[partition].edges[classname].save());
									}
									promises.push(edge.loaded);
									const evalue = key==="#" ? value : toEdgeValue(value);
									edge = edge.edges[evalue];
									if(!edge || !edge.loaded) {
										edge = database[partition].edges[classname].edges[key].edges[evalue] = new Graph(`${database[partition].key}/${classname}/${key}/${evalue}`,value,save);
										promises.push(database[partition].edges[classname].edges[key].save());
									}
									promises.push(edge.loaded);
									edge.edges[id] = database[partition].edges[classname].edges[id];
									promises.push(edge.save());
								}
					}
					this.handle("put",data);
					return Promise.all(promises);
				} else {
					this.value = data;
					return this.save();
				}
				
			}
			async save() {
				if(Object.keys(this.edges).length===0 && this.value===undefined) return await storage.removeItem(this.key);
				await storage.setItem(this.key,JSON.stringify(this)); // await?
				return this;
			}
		}
		var database = this;
		this.storage = storage;
		this.options = Object.assign({},options);
		if(!this.options.expirationInterval) this.options.expirationInterval = 30*60*1000;
		this.constructors = {};
		this.schema = {};
		this.register(Object);
		this.register(Date);
		this.register(Trigger);
		//this.register(Metadata);
		this.tests = Object.assign({},Database.tests);
		if(options.tests) Object.assign(this.tests,options.tests);
		for(let fname in this.tests) {
			const f = this.tests[fname];
			Query.prototype[fname] = function(...args) {
				this.command.push(value => f(...args)(value) ? value : undefined);
				return this;
			}
		}
		
		if(!storage.setItem) storage.setItem = storage.set;
		if(!storage.getItem) storage.getItem = storage.get;
		if(!storage.removeItem) storage.removeItem = storage.del || storage.remove || storage.delete;
		if(!storage.clear) storage.clear = storage.flush || storage.flushdb;
		if(options.callbacks) {
			for(let key in options.callbacks) {
				const f = storage[key];
				storage[key] = (...args) => { args.push(options.callbacks[key]); f.call(storage,...args); }
			}
		}
		if(options.trace) {
			for(let key of options.trace) {
				const f = storage[key];
				storage[key] = (...args) => { console.log("trace:",key,...args); f.call(storage,...args); }
			}
		}
		if(this.options.promisify) {
			for(let key of ["get","set","del","clear"]) {
				const f = storage[key];
				storage[key] = (...args) => { return new Promise((resolve,reject) => { args.push(value => resolve(value)); f.call(storage,...args); })}
			}
		}
		this.data = new Graph(this.options.root||"root");
		this.data.isRoot = true;
		this.security = new Graph("security");
		this.security.isRoot = true;
		this.triggers = new Graph("triggers");
		this.triggers.isRoot = true;
		this.expire();
	}
	async deserialize(data) {
		const type = typeof(data);
		if(!data || type!=="object") return data;
		if(Array.isArray(data)) return data.map(async item => await this.deserialize(data));
		for(let key in data) {
			let value = data[key];
			if(key!=="#" && parseId(value)) {
				data[key] = await this.getObject(value);
			} else {
				value = compile(value);
				if(typeof(value)==="function") {
					Object.defineProperty(data,key,{enumerable:false,configurable:true,writable:true,value});
				} else {
					data[key] = value;
				}
			}
		}
		const classname = parseId(data["#"])[0];
		if(classname) {
			if(!Function("object","cls","return object instanceof cls")(data,this.constructors[classname])) {
				data = Object.assign(Object.create(this.constructors[classname].prototype),data);
				Object.defineProperty(data,"constructor",{enumerable:false,configurable:true,writable:true,value:this.constructors[classname]});
			}
		}
		return data;
	}
	async expire() {
		const expireData = async () => {
			if(this.options.expirationInterval>0) {
				const start = Date.now();
				await this.query().get(`Metadata/expires/lte(${start})`).map(metadata => metadata.subject).delete().exec();
				const end = Date.now(),
					duration = end - start;
					if(duration>=this.options.expirationInterval) {
						this.expire();
					} else {
						setTimeout(() => this.expire(),this.options.expirationInterval-duration);
					}
			}
		}
		expireData();
	}
	getEdge(path,partition="data") {
		const parts = Array.isArray(path) ? path.slice() : path.split("/");
		let part,
			edge = this[partition];
		while((part = parts.shift()) && (edge = edge.edges[part]));
		if(parts.length===0) return edge;
	}
	async getObject(id,partition="data") {
		const parts = id.split("@"),
			classname = parts[0];
		if(classname==="Date") return new Date(parseInt(parts[1]));
		let edge = this[partition].edges[classname] && this[partition].edges[classname].edges[id] ? this[partition].edges[classname].edges[id] : undefined;
		if(!edge) return;
		let value = edge.value;
		if(!value) return;
		const ctor = this.constructors[classname] || compile(this[partition].edges[classname].value) || Object;
		if(value.constructor!==ctor) {
			edge.value = Object.assign(Object.create(ctor.prototype),value);
		}
		const returnValue = (value ? Object.assign(Object.create(ctor.prototype),value) : value),
		storedValue = (value ? Object.assign(Object.create(ctor.prototype),value) : value);
		Object.defineProperty(returnValue,"constructor",{enumerable:false,configurable:true,writable:true,value:ctor});
		Object.defineProperty(storedValue,"constructor",{enumerable:false,configurable:true,writable:true,value:ctor});
		Object.freeze(storedValue);
		for(let cname in this.security.edges) {
			if(cname==="\\*" || cname==="\\"+classname) {
				const cedge = this.security.edges[cname],
					f = compile(cedge.value);
				if(!f("get",returnValue,storedValue)) return;
				for(let key in cedge.edges) {
					const kedge = cedge.edges[key];
					key = key.substring(1); // remove slash
					if(key==="*") {
						for(let key in returnValue) {
							for(let value in kedge.edges) {
								const vedge = kedge.edges[value],
									f = compile(value.substring(1));
								if(f(returnValue[key])) {
									const f = compile(vedge.value);
									if(!f("get",returnValue,storedValue,key)) return;
								}
							}
						}
					} else if(returnValue[key]!==undefined) {
						const f = compile(kedge.value);
						if(!f("get",returnValue,storedValue,key)) return;
					}
				}
			}
		}
		return returnValue;
	}
	match(object,pattern) {
		for(let key in pattern) {
			const test = pattern[key],
				type = typeof(test);
			if(type==="function") {
				if(!test(object[key])) return false;
			} else if(test && type==="object") {
				return this.match(object[key],test);
			} else if(object[key]!==test) {
				return false;
			}
		}
		return true;
	}
	query() {
		return new Query(this);
	}
	register(ctor,name=ctor.name,schema=ctor.schema) {
		this.constructors[name] = ctor;
		this.schema[name] = schema;
	}
	serialize(data) { // should be checking for schema?, how about recursion and seen for circular structures?
		const type = typeof(data);
		if(type=="function") return data+"";
		if(!data || type!=="object") return data;
		if(data instanceof Date) return defaultIdGenerator(data); //data.getTime();
		if(Array.isArray(data)) return data.map(item => this.serialize(item));
		const object = {};
		for(let key in data) {
			const value = data[key];
			if(value && typeof(value)==="object") {
				if(value instanceof Date) {
					object[key] = `Date@${value.getTime()}`;
				} else if(Array.isArray(value)) {
					object[key] = this.serialize(value);
				} else if(value["#"]) {
					object[key] = value["#"];
				} else {
					object[key] = this.serialize(value);
				}
			} else {
				object[key] = this.serialize(value);
			}
		}
		return object;
	}
	validate(data) {
		const type = typeof(data);
		if(!data || type!=="object") return true;
		const classname = data.constructor.name,
			schema = this.schema[classname];
		if(schema && typeof(schema)==="object") {
			if(data.isPattern) return true;
			for(let key in schema) {
				const value = schema[key],
					type = typeof(value),
					ovalue = data[key];
				if(!value(ovalue)) {
					throw new TypeError(`${data["#"]}.${key}===${ovalue} violates schema ${classname}.${key} ${value}`);
				}
				this.validate(value);
			}
		} else {
			for(let key in data) this.validate(data[key]);
		}
	}
	static get tests() {
		return {
			gt(test) {
				return value => value > test;
			},
			gte(test) {
				return value => value >= test;
			},
			eq(test,depth=Infinity) {
				return value => {
					const ttype = typeof(test),
						type = typeof(value)
					if(value == test && ttype!=="undefined" && type!=="undefined") return true;
					if(test && value && ttype==="object" && type==="object") {
						return deepEqual(test,value,depth);
					}
					return false;
				}
			},
			between(b1,b2,boundaries) {
				return value => (boundaries && (value===b1 || value===b2)) || (value>b1 && value<b2) || (value>b2 && value<b1);
			},
			outside(b1,b2) {
				return value => value != b1 && value !=b2 && (b2 > b1 ? value<b1 || value>b2 : value>b1 || value<b2);
			},
			eeq(test) {
				return value => value === test;
			},
			echoes(test) {
				return value => soundex(value)===soundex(test);
			},
			matches(test) {
				return value => value && (test instanceof RegExp ? test : new RegExp(test)).test(value);
			},
			contains(test) {
				return value && value.indexOf && value.indexOf(test)>0;
			},
			neq(test) {
				return value => value != test;
			},
			lte(test) {
				return value => value <= test;
			},
			lt(test) {
				return value => value < test;
			},
			in(test) {
				return value => test.indexOf(value)>=0;
			},
			nin(test) {
				return value => test.indexOf(value)===-1;
			},
			not(test) {
				return value => !test(value);
			}
		}
	}
}

//Database.Query = Query
if(typeof(module)!=="undefined") module.exports = Database;
if(typeof(window)!=="undefined") window.Database = Database;

}).call(this);
