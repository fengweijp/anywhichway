(function() {

//soundex from https://gist.github.com/shawndumas/1262659
const soundex = (a) => {a=(a+"").toLowerCase().split("");var c=a.shift(),b="",d={a:"",e:"",i:"",o:"",u:"",b:1,f:1,p:1,v:1,c:2,g:2,j:2,k:2,q:2,s:2,x:2,z:2,d:3,t:3,l:4,m:5,n:5,r:6},b=c+a.map(function(a){return d[a]}).filter(function(a,b,e){return 0===b?a!==d[c]:a!==e[b-1]}).join("");return(b+"000").slice(0,4).toUpperCase()};

// from https://gist.github.com/lovasoa/3361645 + length==1 mod by AnyWhichWay
function intersection(){if(arguments.length===1) return arguments[0]; var a,b,c,d,e,f,g=[],h={},i;i=arguments.length-1;d=arguments[0].length;c=0;for(a=0;a<=i;a++){e=arguments[a].length;if(e<d){c=a;d=e}}for(a=0;a<=i;a++){e=a===c?0:a||c;f=arguments[e].length;for(var j=0;j<f;j++){var k=arguments[e][j];if(h[k]===a-1){if(a===i){g.push(k);h[k]=0}else{h[k]=a}}else if(a===0){h[k]=0}}}return g}


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
		if(!typeof(string)==="string") return string;
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
	toEdgeValue = value => (typeof(value)==="string" && !parseId(value) && value!=="*") ? JSON.stringify(value) : value;

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
			else yield*  pipe(functions.splice(0,1),value,true);
		}
	} else if(Object.getPrototypeOf(next).constructor===Object.getPrototypeOf(async function(){}).constructor) {
		const value = await next(arg);
		if(value!==undefined) {
			if(functions.length===1) yield value;
			else yield*  pipe(functions.splice(0,1),value,true);
		}
	} else if(Object.getPrototypeOf(next).constructor===Object.getPrototypeOf(function*(){}).constructor) {
		functions.splice(0,1);
		for await (let value of next(arg)) {
			if(value!==undefined) {
				if(functions.length===0) yield value; 
				else yield*  pipe(functions,value,true);
			}
			if(pipe.END) return;
		}
	} else if(Object.getPrototypeOf(next).constructor===Object.getPrototypeOf(async function*(){}).constructor) {
		functions.splice(0,1);
		for await (let value of next(arg)) {
			if(value!==undefined) {
				if(functions.length===0) yield value;
				else yield* pipe(functions,value,true);
			}
			if(pipe.END) return;
		}
	} else {
		throw new TypeError("Unsupported function type passed to pipe")
	}
	return;
}


class Query {
	constructor(database) {
		this.command = [];
		this.database = database;
	}
	async all() {
		if(this.results) return this.results;
		for(let command of this.command) {
			if(command.name==="collect") this.command = command(this.command);
		}
		this.results = [];
		for await (let item of pipe(this.command)) {
			this.results.push(item);
		}
		return this.results;
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
	every(f) {
		this.collect();
		this.command.push(data => 
			data.every(f) ? data : undefined
		);
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
		this.command.push(data => { f(data); return data;} );
		return this;
	}
	get(pathOrPattern) {
		const edge = this.database.data;
		this.command.push(async function*() { for await (let next of edge.get(normalizePathOrPattern(pathOrPattern))) yield next; });
		return this;
	}
	join(...pathsOrPatternsAndTest) {
		const database = this.database,
			edge = this.database.data,
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
		this.command.push(data => f(data));
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
	merge(query,where) {
		this.commands.push(async function*(data) {
			const values = query.all();
				record = (Array.isArray(data) ? data : [data]);
			record.slice().push(value);
			for(let value of values) {
				if(!where || where(record)) yield record;
			}
		})
		return this;
	}
	pop() {
		this.collect();
		this.command.push(function*(data) {
			data.pop();
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
	put(...data) {
		const root = this.database.data,
			last = data[data.length-1],
			type = typeof(last);
		let duration;
		if(type==="number" || (last && type=="object" && last instanceof Date)) {
			data.pop();
			if(type==="number") { // then a date
				duration = last;
			} else {
				duration = last.getTime() - Date.now();
			}
		}
		this.command.push(async function*(edge) { for(let item of data) { (edge||root).put(item,duration); yield item; }});
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
				next.save();
			}
			yield edge||root;
		});
		return this;
	}
	seen(f,first) {
		const seen = [];
		let once;
		this.command.push(data => { 
			if(!seen.includes(data)) {
				if(!first || !once) f(data);
				once = true;
			}
			seen.push(data);
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
	shift() {
		this.collect();
		this.command.push(function*(data) {
			data.shift();
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
			constructor(path="",value,put) {
				const key = typeof(path)==="string" ? path : path.join("/"),
						parts = key.split("/"),
						idparts = parseId(parts.pop());
				if(idparts) {
					let [classname,id] = idparts;
					if(classname==="Date") value = new Date(id);
				}
				this.key = key; // use to load from a key value store as prefix
				this.edges = {};
				this.onput = {};
				this.onpatch = {};
				this.ondelete = {};
				if(value!==undefined) this.value = value;
				const loaded = new Promise(async resolve => {
					//if(idparts && idparts[0]==="Date") {
					//	resolve();
					//	return;
					//}
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
					if(put || create) {
						if(!this["^"]) {
							this["^"] = {created:Date.now()};
						} else {
							this["^"].updated = Date.now();
						}
						if(typeof(put)==="number") this["^"].expiration = put;
						await storage.setItem(key,JSON.stringify(this));
						parts.shift(); // remove root;
						parts.pop(); // remove self
						parts.pop(); // remove parent
						const gparent = database.getEdge(path);
						if(gparent) {
							for(let fstr in gparent.onput) {
								if(typeof(gparent.onput[fstr])==="boolean") gparent.onput[fstr] = new Function("return " + fstr);
								const event = {path:path.join("/"),value,event:"put"};
								if(parseId(value)) {
									event.object = database.getObject(value);
									event.value = event.object[path[path.length-1]];
								}
								gparent.onput[fstr](event)
							}
						}
					}
					resolve(true);
				});
				Object.defineProperty(this,"loaded",{enumerable:false,configurable:false,writable:true,value:loaded});
			}
			async atomize(object,idGenerator= object => object instanceof Date ? `Date@${object.getTime()}` : `${object.constructor.name}@${uuidv4()}`) { // move to db
				let	atoms = [],
					id = object["#"];
				if(!id) id = object["#"] = idGenerator(object);
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
					if(value && type==="object") {
						const children = await this.atomize(value,idGenerator);
						atoms = atoms.concat(children);
						atoms.push([value.constructor,"..",value["#"],id]);
					} else if(type!=="undefined"){
						atoms.push([ctor,id,key,value]);
					}
				}
				return atoms;
			}
			toJSON() {
				const value = database.serialize(this.value), //database.serialize(this.value), //(typeof(this.value)==="function" ? this.value+"" : this.value), //
					json = {value,"^":this["^"],onput:{},ondelete:{}};
				for(let key in this.onput) {
					json.onput[key] = true;
				}
				for(let key in this.ondelete) {
					json.ondelete[key] = true;
				}
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
			async* find(pattern,all) {
				await this.loaded;
				const sets = [],
					atoms = await this.atomize(pattern,() => "*");
				for(let [ctor,id,key,value] of atoms) {
					if(!all && key==="#" && value==="*") continue; //avoid matching all objects!
					const set = [],
						generator = this.get([ctor.name,key,(value==="*" ? value : toEdgeValue(value)),id],false,false,true);
					for await (let edge of generator) set.push(edge.key.split("/").pop())
					sets.push(set);
				}
				const results = intersection(...sets);
				for(let id of results) {
					const [classname,uuid] = parseId(id);
					yield database.data.edges[classname].edges[id].value;
				}
				return;
			}
			async* get(pathOrPattern="",create,put,edgeOnly) { // change to path or pattern, call find for pattern
				if(pathOrPattern==="") {
					yield this;
					return;
				}
				if(typeof(pathOrPattern)==="function") {
					yield pathOrPattern();
					return;
				}
				if(typeof(pathOrPattern)==="object" && !Array.isArray(pathOrPattern)) return yield* this.find(pathOrPattern);
				await this.loaded;
				let parts = Array.isArray(pathOrPattern) ? pathOrPattern : pathOrPattern.split("/");
				if(database.options.inline) parts = compilePath(parts);
				let edge;
				if(parts.length===0) {
						if(edgeOnly) {
							yield this
						}
						else {
							const value = this.value;
							yield (typeof(value)==="object" && value["#"] ? await database.getObject(value["#"]) : toValue(value));
						}
				} else {
					let key = parts.shift();
					const type = typeof(key);
					if(type==="string") {
						if(key==="..") {
							const parts = this.key.split("/");
							parts.shift();
							const child = database.getEdge(parts);
							for(let id in child.edges) {
								let edge = child.edges[id];
								if(!edge || !edge.loaded) {
									const classname = parseId(id)[0];
									edge = child.edges[id] = new Graph(`${database.data.key}/${classname}/${id}`);
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
							const edge = database.getEdge(parts);
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
							const fname = key.substring(0,key.indexOf("(")); // swicth to RegExp
							const test = database.tests[fname];
							if(test) {
								let testvalue =  toValue(key.substring(key.indexOf("(")+1,key.indexOf(")")));
								if(database.options.inline) testvalue = compileInlineArg(testvalue);
								for(let value in this.edges) {
									let totest = (parseId(value) ? await database.getObject(value) : toValue(value));
									if(test(testvalue)(totest)) {
										if(!this.edges[value].loaded) {
											this.edges[value] = new Graph(`${this.key}/${value}`,toValue(value),put);
										}
										 yield* await this.edges[value].get(parts.slice(),create,put,edgeOnly);
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
								let totest = (parseId(value) ? await database.getObject(value) : toValue(value));
								if(test(totest)!==undefined) {
									if(!this.edges[value].loaded) {
										this.edges[value] = new Graph(`${this.key}/${value}`,toValue(value),put);
										await this.edges[value].loaded;
									}
									yield* await this.edges[value].get(parts.slice(),create,put,edgeOnly);
								}
							}
						} catch(e) {
							true;
						}
					} else if(key==="*") {
						for(let value in this.edges) {
							if(!this.edges[value].loaded) {
								this.edges[value] = new Graph(`${this.key}/${value}`,toValue(value),put);
								await this.edges[value].loaded;
								if(create && !put) await this.save();
							}
							yield* await this.edges[value].get(parts.slice(),create,put,edgeOnly);
						}
					} else {
						edge = this.edges[key];
						if(!edge && !create) return;
						if(!edge || !edge.loaded) {
							edge = this.edges[key]  = new Graph(`${this.key}/${key}`,toValue(key),put);
							await this.edges[key].loaded;
						}
						let keyparts;
						if((keyparts=parseId(key))) {
							const classname = keyparts[0];
							edge = edge.edges[key] = database.data.edges[classname].edges[key];
							if(!edge) {
								edge = edge.edges[key] = database.data.edges[classname].edges[key] = database.data.edges[key] = new Graph(`${database.data.key}/${key}`,toValue(key),put);
								await edge.loaded;
							}
							await edge.loaded;
							edge.value || (edge.value = {});
							if(this.match(parts,edge.value,create)) yield edge;
							return;
						}
						if(edge) {
							yield* await edge.get(parts.slice(),create,put,edgeOnly);
						}
					}
				}
			}
			getParent() {
				const path = this.key.split("/");
				path.shift(); // remove root reference
				path.pop(); // remove self reference
				return database.getEdge(path);
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
											if(!database.data.edges[key].edges[value].edges[id] || !database.data.edges[key].edges[value].edges[id].loaded) {
												const edge = database.data.edges[key];
												for(let fstr in edge.onput) {
													if(typeof(edge.onput[fstr])==="boolean") edge.onput[fstr] = new Function("return " + fstr);
													puts.push(() => edge.onput[fstr]({path:edge.key.substring(edge.key.indexOf("/")+1),value:newvalue,object,event:"put"}));
												}
												database.data.edges[key].edges[value].edges[id] = database.data.edges[id]; 
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
				for(let put of puts) {
					put();
				}
				for(let patch of patches) {
					await patch.edge.save(); 
					for(let fstr in patch.edge.onpatch) {
						if(typeof(patch.edge.onpatch[fstr])==="boolean") patch.edge.onpatch[fstr] = new Function("return " + fstr);
						patch.edge.onpatch[fstr]({path:patch.edge.key.substring(patch.edge.key.indexOf("/")+1),oldvalue:patch.oldvalue,newvalue:patch.newvalue,event:"patch",object:patch.object})
					}
				}
			}
			async put(data,duration) {		
				await this.loaded;
				const type = typeof(data);
				if(data && type==="object") {
					const atoms = await this.atomize(data),
						//ctor = data.constructor===Date ? (...args) => new Date(...args) : data.constructor,
						//classname = ctor.name,
						tosave = {};
					//if(!database.constructors[classname]) database.constructors[classname] = ctor;
					for(let [ctor,id,key,value] of atoms) {
						const classname = ctor.name;
						let edge = database.data.edges[classname];
						if(!edge || !edge.loaded) edge = database.data.edges[classname] = new Graph(`${database.data.key}/${classname}`,ctor===Date ? (...args) => new Date(...args) : ctor,true);
						await edge.loaded;
						if(id!=="..") {
							tosave[classname] = true;
							database.data.edges[classname].edges[id] = new Graph(`${database.data.key}/${classname}/${id}`,data,duration||true);
							edge = edge.edges[key];
							if(!edge || !edge.loaded) {
								tosave[classname] = true;
								edge = database.data.edges[classname].edges[key] = new Graph(`${database.data.key}/${classname}/${key}`,key,true);
							}
							await edge.loaded;
							const evalue = key==="#" ? value : toEdgeValue(value);
							edge = edge.edges[evalue];
							if(!edge || !edge.loaded) {
								edge = database.data.edges[classname].edges[key].edges[evalue] = new Graph(`${database.data.key}/${classname}/${key}/${evalue}`,value,duration||true);
								await database.data.edges[classname].edges[key].save();
							}
							await edge.loaded;
							if(key==="#") {
								
							}
							edge.edges[id] = database.data.edges[classname].edges[id];
							await edge.save();
						} else {
							const parentclass = parseId(value)[0];
							database.data.edges[classname].edges[key].edges[value] = database.data.edges[parentclass].edges[value];
							await database.data.edges[classname].edges[key].save();
						}
					}
					for(let classname in tosave) {
						await database.data.edges[classname].save();
					}
				} else {
					this.value = data;
					await this.save();
				}
			}
			register(ctor,name=ctor.name) {
				this.constructors[name] = ctor;
			}
			async save() {
				if(Object.keys(this.edges).length===0 && this.value===undefined) return await storage.removeItem(this.key);
				if(!this["^"]) {
					this["^"] = {created:Date.now()};
				} else {
					this["^"].updated = Date.now();
				}
				storage.setItem(this.key,JSON.stringify(this)); // await?
				return this;
			}
			async delete(pathOrPattern) {
				if(arguments.length===0) {
					for(let value in this.edges) {
						const edge = this.edges[value];
						await edge.loaded;
						await edge.delete();
					}
					this.edges = {};
					delete this.value;
					await this.save();
					return;
				}
				if(typeof(pathOrPattern)==="object" && !Array.isArray(pathOrPattern)) {
					let deleted,
						next;
					for await (let value of this.find(pathOrPattern)) {
						const edge = database.data.edges[value];
						if(edge) {
							await edge.loaded;
							const object = edge.value;
							if(object && typeof(object)==="object" && object["#"]) {
								const atoms = await this.atomize(object,false);
								for(let [id,key,value] of atoms) {
									if(id===object["#"]) await database.data.delete([key,toEdgeValue(value),id]);
								}
							}
							await edge.delete();
							delete database.data.edges[value];
							deleted = true;
						}
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
		}
		var database = this;
		this.storage = storage;
		this.options = Object.assign({},options);
		this.constructors = {Object,Date};
		this.tests = Object.assign({},Database.tests);
		if(options.tests) Object.assign(this.tests,options.tests);
		this.commands = [];
		this.onput = {};
		this.onpatch = {};
		this.ondelete = {};
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
	}
	concat(...data) {
		return async function* (...args) {
			for(let item of args) yield item;
			for(let item of data) {
				if(Array.isArray(item)) {
					for(let element of item) yield element;
				} else {
					yield item;
				}
			}
			return;
		}
	}
	delete(object) {
		return async function* (...args) {
			yield args;
			return;
		}
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
	get(pathOrPattern,ctor)  {
		if(ctor) {
			pathOrPattern = Object.assign(Object.create(ctor.prototype),pathOrPattern);
		}
		return new Query(this).get(pathOrPattern);
	}
	getEdge(path,root="data") {
		const parts = Array.isArray(path) ? path.slice() : path.split("/");
		let part,
			edge = this[root];
		while((part = parts.shift()) && (edge = edge.edges[part]));
		if(parts.length===0) return edge;
	}
	async getObject(id) {
		const parts = id.split("@"),
			classname = parts[0];
		if(classname==="Date") return new Date(parseInt(parts[1]));
		let edge = this.data.edges[classname] && this.data.edges[classname].edges[id] ? this.data.edges[classname].edges[id] : undefined;
		if(!edge) return;
		let value = edge.value;
		if(!value) return;
		const ctor = this.constructors[classname] || compile(this.data.edges[classname].value) || Object;
		if(value.constructor!==ctor) {
			edge.value = Object.assign(Object.create(ctor.prototype),value);
		}
		const returnValue = (value ? Object.assign(Object.create(ctor.prototype),value) : value),
		storedValue = (value ? Object.assign(Object.create(ctor.prototype),value) : value);
		returnValue.constructor = ctor;
		storedValue.constructor = ctor;
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
	join(...pathsOrPatternAndTest)  {
		return new Query(this).join(...pathsOrPatternAndTest);
	}
	patch(data,object)  {
		return async function* (...args)  { 
			yield args; 
			return;
		}
	}
	provide(...values)  {
		return new Query(this).provide(...values);
	}
	put(...data)  {
		return new Query().get().put(...data);
	}
	serialize(data) {
		const type = typeof(data);
		if(type=="function") return data+"";
		if(!data || type!=="object") return data;
		if(data instanceof Date) return data.getTime();
		const object = {};
		for(let key in data) {
			const value = data[key];
			if(value && typeof(value)==="object") {
				if(value instanceof Date) {
					object[key] = `Date@${value.getTime()}`;
				} else {
					object[key] = value["#"];
				}
			} else {
				object[key] = this.serialize(value);
			}
		}
		return object;
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

window.Query = Query
if(typeof(module)!=="undefined") module.exports = Database;
if(typeof(window)!=="undefined") window.Database = Database;

}).call(this);
//var db0;
//async function test() {
//	db0 = new Database(localStorage,{inline:true,root:"root"});
	//db0.on("name","patch",(...args) => console.log("changes:",args));
	//db0.on({name:value=>value==="Bill"},"patch",(...args) => console.log("patch:",args));
	//db0.on({name:value=>value==="Joe"},"put",(...args) => console.log("put:",args));
	//db0.on({name:value=>value==="John"},"delete",(...args) => console.log("delete:",args));
	//await db0.get("name").on("put",(event) => console.log(event));
	//await db0.get("age").on("put",(event) => console.log(event));
	//await db0.get("age").on("patch",(event) => console.log(event));
	//await db0.get("id").on("put",(event) => console.log(event));
//}
//test();