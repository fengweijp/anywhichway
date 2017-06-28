
var Database, JSONBlockStore;
if(typeof(window)==="undefined") {
	Database = require("../index.js");
	JSONBlockStore = require("../lib/JSONBlockStore.js");
}
let storage;
if(JSONBlockStore) {
	storage = new JSONBlockStore("./blockstore","#key",true);
	//storage = new Database.LocalStore();
} else {
	storage = new Database.LocalStore();
}
storage.clear();

const collection = [];
let db;
async function test() {
	const size = 1000, // try 1000000
		start = Date.now();
	db = new Database("test",storage,{nocache:true});
	//db.peer(new Database.RemoteDatabase(db,"127.0.0.1"));
	for(let i=0;i<size;i++) {
		await db.put({item:i});
	}
	const put = Date.now(),
		expired = put - start,
	persec = size / (expired / 1000);
	console.log("put",expired,persec);
	db.get("item").collect(collection).on(value => {
		if(collection.length===size-1) {
			const collect = Date.now(),
				expired = collect - put,
				persec = size / (expired / 1000);
			console.log("collect",expired,persec,collection[size/2]);
		}
	});
}
test();