(function() {
	"use strict"

	// enhance to auto-create directory
	
	const fs = require("fs"),
		readline = require("readline"),
		blockString = (block,encoding="utf8") => {
			return "[" + bytePadEnd(block[0]+"",20," ",encoding) + "," + bytePadEnd(block[1]+"",20," ",encoding) + "]";
		},
		bytePadEnd = (str,length,pad,encoding="utf8") => {
			const needed = length - Buffer.byteLength(str,encoding);
			if(needed>0) return str + Buffer.alloc(needed," ",encoding).toString(encoding);
			return str;
		};

	function asyncy(functionOrObject,inlineCatch=false,target=functionOrObject) {
		const compile = (f) => {
				return async function() {
					const me = this;
					return await asyncy.inline(me,f,...arguments);
				}
			},
			type = typeof(functionOrObject);
		if(type==="function") return compile(functionOrObject);
		if(functionOrObject && type==="object") {
			for(let key in functionOrObject) {
				const token = key.substring(key.length-("Async").length),
					value = functionOrObject[key],
					type = typeof(value);
				if(token.indexOf("Sync")>0 || type!=="function") continue;
				target[key] = compile(functionOrObject[key]);
			}
			return target;
		}
		throw new TypeError("asyncy takes a function or a non-null object argument not a " + type);
	}
	asyncy.inline = function (thisArg,f,...args) {
		const cb = (typeof(args[args.length-1])==="function" ? args.pop() : null);
		return new Promise((resolve,reject) => {
			try {
				let outerresult = f.call(thisArg,...args,(err,result) => {
					outerresult = undefined;
					if(err) {
						resolve({err,args,result});
					} else {
						if(cb) {
							try {
								cb(null,result);
							} catch(err) {
								resolve({err,args:result});
							}
						}
						resolve({result});
					}
				});
				if(!["nextTick","setTimeout","setInterval"].includes(f.name)) {
					setTimeout(() => {
						// assume a function that returns a value is not one that invokes a callback
						// there are exceptions, but the programmer will need to handle those
						if(outerresult!==undefined) {
							if(outerresult instanceof Promise) outerresult.then(result => resolve({result}));
							else if(outerresult instanceof Error) resolve({err:outerresult});
							else resolve({result:outerresult});
						}
					});
				}
			} catch(err) {
				resolve({err,args})
			}
		});
	}

	function JSONBlockStore(path,keyProperty,clear) {
		this.path = path;
		this.encoding = "utf8";
		this.opened = false;
		if(clear) this.clear();
	}
	JSONBlockStore.prototype.alloc = async function(length,encoding="utf8") {
			const me = this;
			let block;
			if(!me.alloc.size) {
				me.alloc.size = Buffer.byteLength(blockString([0,0],encoding),encoding);
				me.alloc.empty = bytePadEnd("null",me.alloc.size," ",encoding);
			}
			for(var i=0;i<me.free.length;i++) {
				block = me.free[i];
				if(block && block[1]-block[0]>=length) {
					let position = ((me.alloc.size+1) * i);
					me.free[i] = null;
					await asyncy.inline(fs,fs.write,me.freefd,me.alloc.empty,position,encoding);
					return block;
				}
			}
			let start = (me.storeSize===0 ? 0 : me.storeSize+1);
			return [start, start+length];
		}
	JSONBlockStore.prototype.count = async function count() {
		return this.keys.length;
	}
	JSONBlockStore.prototype.clear = function() {
			this.close();
			try {
				fs.unlinkSync(this.path + "/free.json");
			} catch(e) { }
			try {
				fs.unlinkSync(this.path + "/blocks.json");
			} catch(e) { }
			try {
				fs.unlinkSync(this.path + "/store.json");
			} catch(e) { }
			this.freeSize = 0;
			this.blocksSize = 0;
			this.storeSize = 0;
			this.free = [];
			this.blocks = {};
			this.keys = [];
	}
	// close is synchronous, it is called very little
	JSONBlockStore.prototype.close = function() {
		if(this.opened) {
			this.opened = false;
			fs.closeSync(this.freefd);
			fs.closeSync(this.blocksfd);
			fs.closeSync(this.storefd);
		}
	}
	JSONBlockStore.prototype.compress =	async function() {
			const me = this;
			if(!me.opened) me.open();
			let newfree = [];
			me.freeSize = 0;
			for(let i=0;i<me.free.length;i++) {
				const block = me.free[i];
				if(block) {
					newfree.push(block);
					let str = blockString(block,me.encoding)+",";
					await asyncy.inline(fs,fs.write,me.freefd,str,me.freeSize,me.encoding);
					me.freeSize += Buffer.byteLength(str,me.encoding);
				}
			}
			me.free = newfree;
			await asyncy.inline(fs,fs.ftruncate,me.freefd,me.freeSize);
			me.blocksSize = 1;
			me.storeSize = 0;
			await asyncy.inline(fs,fs.write,me.blocksfd,"{",0,me.encoding);
			const blockkeys = Object.keys(me.blocks);
			for(let key of blockkeys) {
				let str = '"'+key+'":' + JSON.stringify(me.blocks[key])+",";
				await asyncy.inline(fs,fs.write,me.blocksfd,str,me.blocksSize,me.encoding);
				me.blocksSize += Buffer.byteLength(str,me.encoding);
			}
			await asyncy.inline(fs,fs.write,me.blocksfd,"}",me.blocksSize-1,me.encoding);
			await asyncy.inline(fs,fs.ftruncate,me.blocksfd,me.blocksSize);
		}
	JSONBlockStore.prototype.delete = async function(id) {
			const me = this;
			if(!me.opened) me.open();
			const block = me.blocks[id];
			if(block) {
				const blanks = bytePadEnd("",block[1]-block[0],me.encoding);
				delete me.blocks[id];
				me.keys.splice(me.keys.indexOf(id),1);
				await asyncy.inline(fs,fs.write,me.storefd,blanks,block[0],"utf8"); // write blank padding
				me.free.push(block);
				let str = blockString(block,me.encoding)+",";
				await asyncy.inline(fs,fs.write,me.freefd,str,me.freeSize,me.encoding);
				me.freeSize += Buffer.byteLength(str,me.encoding);
				str = (me.blocksSize===0 ? '{' : ',')+'"'+id+'":null}';
				const fposition = (me.blocksSize===0 ? 0 : me.blocksSize-1);
				me.blocksSize = fposition + Buffer.byteLength(str,me.encoding);
				await asyncy.inline(fs,fs.write,me.blocksfd,str,fposition,me.encoding);
			}
		}
	JSONBlockStore.prototype.get = async function(id) {
		const me = this;
		if(!me.opened) me.open();
		const block = me.blocks[id];
		if(block) {
			const buffer = Buffer.alloc(block[1]-block[0]);
			await asyncy.inline(fs,fs.read,me.storefd,buffer,0,block[1]-block[0],block[0]);
			try {
				const str = buffer.toString().replace(/[\0\n]/g,"");
				return JSON.parse(str);
			} catch(e) {
				console.log(e,buffer.toString());
			}
		}
	}
	JSONBlockStore.prototype.key = async function(number) {
		return this.keys[number];
	}
	// open is synchronous, it is called very little and
	JSONBlockStore.prototype.open = function() { // also add a transactional file class <file>.json, <file>.queue.json, <file>.<line> (line currently processing), <file>.done.json (lines processed)
		let result;
		//console.log(result)
		try {
			this.freefd = fs.openSync(this.path + "/free.json","r+");
		} catch(e) {
			this.freefd = fs.openSync(this.path + "/free.json","w+");
		}
		try {
			this.blocksfd = fs.openSync(this.path + "/blocks.json","r+");
		} catch(e) {
			this.blocksfd = fs.openSync(this.path + "/blocks.json","w+");
		}
		try {
			this.storefd = fs.openSync(this.path + "/store.json","r+");
		} catch(e) {
			this.storefd = fs.openSync(this.path + "/store.json","w+");
		}
		const blocks = fs.readFileSync(this.path + "/blocks.json",this.encoding),  // {<id>:{start:start,end:end,length:length}[,...]}
			freestat = fs.fstatSync(this.freefd),
			blockstat = fs.fstatSync(this.blocksfd),
			storestat = fs.fstatSync(this.storefd),
			free = fs.readFileSync(this.path + "/free.json",this.encoding); // [{start:start,end:end,length:length}[,...]]
		if(free.length===0) {
			this.free = [];
		} else {
			//console.log(free)
			free = free.trim();
			if(free[0]===",") free = free.substring(1);
			if(free[free.length-1]===",") free = free.substring(0,free.length-1);
			try {
				this.free= JSON.parse("["+free+"]");
			} catch(e) {
				console.log(e,"["+free+"]");
			}
		}
		try {
			this.blocks = (blocks.length>0 ? JSON.parse(blocks) : {});
		} catch(e) {
			console.log(e,blocks);
		}
		this.freeSize = freestat.size;
		this.blocksSize = blockstat.size;
		this.storeSize = storestat.size;
		this.keys = Object.keys(this.blocks);
		this.opened = true;
		return true;
	}
	JSONBlockStore.prototype.set = async function set(id,data) {
			const me = this;
			if(!me.opened) me.open();
			set.queue.push([id,data]);
			while(set.queue.length>0) {
				[id,data] = set.queue.shift();
				const block = me.blocks[id];
				let str = JSON.stringify(data)+"\n";
				const blen = Buffer.byteLength(str, 'utf8');
				if(block) { // if data already stored
					const pdata = bytePadEnd(str,(block[1]-block[0]),me.encoding);
					if((block[0] + blen) - 1 < block[1]) { // and update is same or smaller
						let result = await asyncy.inline(fs,fs.write,me.storefd,pdata,block[0],me.encoding); // write the data with blank padding
						continue;
					}
				} else {
					me.keys.push(id);
				}
				const freeblock = await me.alloc(blen,me.encoding), // find a free block large enough
					pdata = bytePadEnd(str,(freeblock[1]-freeblock[0]),me.encoding);
				me.storeSize = Math.max(freeblock[1],me.storeSize);
				me.blocks[id] = freeblock; // update the blocks info
				if(block) { // free old block which was too small, if there was one
					const pdata = bytePadEnd("",(block[1]-block[0]),me.encoding);
					me.free.push(block);
					str = blockString(block,me.encoding)+",";
					let result = await asyncy.inline(fs,fs.write,me.storefd,pdata,block[0],me.encoding); // write blank padding
					result = await asyncy.inline(fs,fs.write,me.freefd,str,me.freeSize,me.encoding);
					me.freeSize += Buffer.byteLength(str,me.encoding);
				}
				let result = await asyncy.inline(fs,fs.write,me.storefd,pdata,freeblock[0]); // write the data with blank padding
				str = (me.blocksSize===0 ? '{' : ',')+'"'+id+'":'+JSON.stringify(freeblock)+"}";
				const fposition = (me.blocksSize===0 ? 0 : me.blocksSize-1);
				me.blocksSize = fposition + Buffer.byteLength(str,me.encoding);
				result = await asyncy.inline(fs,fs.write,me.blocksfd,str,fposition,me.encoding);
			}
		}
	JSONBlockStore.prototype.set.queue = [];
	module.exports = JSONBlockStore;
}).call(this);