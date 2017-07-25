
var Database, cryptozoa, storage;

if(typeof(window)==="undefined") {
	Database = require("../index.js");
	cryptozoa = require("cryptozoa");
	const BlockStore = require("blockstore");
	storage = new BlockStore("./blockstore");
	//const CloudStore = require("../lib/CloudStore.js");
	//storage = new CloudStore("test");
} else {
	storage = new Database.LocalStore();
}


let db, gets= 0;
async function test() {
	const size = 1000, // try 1000000
		start = Date.now();
	db = new Database("test",storage,{index:true}); //,{encrypt:"password"}
	//db.peer(new Database.RemoteDatabase(db,"127.0.0.1"));
	for(let i=0;i<size;i++) {
		await db.put({item:i},i);
	}
	const put = Date.now();
	let expired = put - start,
		persec = size / (expired / 1000);
	console.log("put",expired,persec);
	for(let i=0;i<size;i++) {
		await db.get(i);
		if(i===size/2) {
			console.log("scan find middle",Date.now() - put);
		}
	}
	const get = Date.now();
	expired = get - put;
	persec = size / (expired / 1000);
	console.log("get",expired,persec);
	db.match({item:size/2,$on: value => { // $collect: collection, 
		console.log("indexed match middle",Date.now() - get);
	}});
	db.match({$on: value => { // $collect: collection, 
		if(++gets===size) {
			const collect = Date.now(),
				expired = collect - get,
				persec = size / (expired / 1000);
			console.log("on all",expired,persec);
		}
	}});
}
storage.clear().then(() => {
	console.log("Benchmarking...");
	test();
})
