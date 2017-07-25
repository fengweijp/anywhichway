(function() {
	// could this be optimized by storing just three files blocks, frre, and store? like a blovkstore in the cloud?
	class CloudStore {
		constructor(name) {
			const me = this,
				Storage = require('@google-cloud/storage');
			me.storage = Storage();
			me.bucket = me.storage.bucket(name+"_anywhichway");
			me.bucket.exists().then((data) => {
				data[0] || me.storage.createBucket(name+"_anywhichway").then((data) => me.bucket = data[0]);
				me.bucket.getFiles((data) => {
					!data || (me.files = data[0]);
				})
			});
		}
		async clear() {
			await this.bucket.deleteFiles({force:true});
		}
		async count() {
			return (this.files ? this.files.length : 0);
		}
		async delete(id) {
			// reset this.files
			this.storageProvider.removeItem(id);
			if(!this.files) {
				[this.files] = await this.bucket.getFiles();
			} else {
				const i = this.files.findIndex((item) => item.name===id);
				i===-1 || this.files.splice(0,i,1);
			}
		}
		async get(id) {
			const me = this,
				streams = require('memory-streams');
			return new Promise((resolve,reject) => {
				const writable = new streams.WritableStream();
				me.bucket.file(id).createReadStream({validation:false})
				  .on('error', (err) => { console.log(id,err.message); })
				  .on('response', (response) => {  })
				  .on('end', () =>  { resolve(writable.toString()); })
				  .pipe(writable);
			});
		}
		async key(number) {
			if(this.files[number]) return this.files[number].name;
		}
		async set(id,data) {
			const me = this;
			return new Promise((resolve,reject) => {
				const file = me.bucket.file(id),
					stream = file.createWriteStream();
				stream.end(data,"utf8",async () => {
					if(!me.files) {
						[me.files] = await me.bucket.getFiles();
					} else {
						me.files.push({name:id});
					}
					resolve(id);
				});
			});
		}
	}
	module.exports = CloudStore;
	//async function testG() {
	//	const db = new CloudStore("test"); // "ac9af80a-b7e1-49d5-f8f4-67d147820096"
	//	await db.clear();
	//	await db.set("testkey","test string");
	//	console.log(await db.get("testkey"));
	//}
	//testG();
}).call(this);