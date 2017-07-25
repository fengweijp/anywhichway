const socket = io.connect(window.location.host),
	storage = new Database.LocalStore();

//storage.clear();

socket.on("connect",() => {
	console.log("connect");
});

socket.on("news",(data) => {
	console.log(data.message);
});

const watch = {};

class RemoteDatabase {
	constructor(local,location) {
		const me = this;
		this.sentSkew = 0;
		this.touchedSkew = 0;
		this.watch = {};
		this.local = local;
		this.socket = io.connect(location);
		this.socket.on("connect",() => {
			console.log("connect");
		});
		this.socket.on("news",(data) => {
			console.log(data.message);
		});
		this.socket.on("config",(config) => {
			!config.keys || (this.keys = config.keys);
			console.log(config);
		});
		this.socket.on("response",async (response) => {
			const request = watch[response.id];
			if(request) {
				let data = response.contents.data;
				if(response.seal) {
					if(await cryptozoa.verify(data,response.seal.publicKey,response.seal.signature)) {
						data = await cryptozoa.asymmetric.decrypt(data,response.contents.password,request.privateKey); // response.contents.password
						console.log(data)
					}
				}
				if(data) {
					const id = data._["#"],
						existing = await this.local.get(id);
					Object.defineProperty(data,"_",{enumerable:false,configurable:true,writable:true,value:data._});
					let time = await local.time(); 
					time += this.sentSkew;
					if(this.touchedSkew) {
						for(let key in data._[">"]) {
							data._[">"][key].touched += this.touchedSkew;
						}
					}
					this.local.put(data,data._["#"],me,time);
					!request.on || request.on(data);
				}
				
			}
		});
	}
	get(id) {
		const envelope = {
			id: Database.uuidv4(),
			contents: {get: id}
		};
		watch[envelope.id] = {envelope,on};
		this.socket.emit("message",envelope);
	}
	match(pattern,on) {
		const envelope = {
			id: Database.uuidv4(),
			contents: {match: pattern}
		};
		watch[envelope.id] = {envelope,on};
		this.socket.emit("message",envelope);
	}
	put(data) {
		const envelope = {
			id: Database.uuidv4(),
			contents: {put: Database.exposeMetadata(data)}
		};
		watch[envelope.id] = {envelope,on};
		this.socket.emit("message",envelope);
	}
	skew(sent=0,touched=0) {
		this.sentSkew = sent;
		this.touchedSkew = touched;
	}
}


async function test() {
	const size = 10,
		db = new Database("test",storage), //,{encrypt:"password"}
		remotedb = new RemoteDatabase(db,window.location.host),
		pattern = {item: {$lt: 5}, $on: (value) => console.log("match:",value)};
	db.source(remotedb);
	
	remotedb.skew(100,1000000)
	
	//for(let i=0;i<size;i++) {
	//	await db.put({item:i},i);
	//}
	
	db.match(pattern);
	
	const envelope = {
			id: Database.uuidv4(),
			contents: {match: pattern}, //
			credentials: {
				
			},
			seal: {
				
			}
		};

	const encrypted = await cryptozoa.asymmetric.encrypt(JSON.stringify(envelope.contents));
	envelope.contents = { data: encrypted.data, publicKey: encrypted.keys.publicKey, password: "peer password",match: {item: 4} }; // match is still going through for testing, shoud not send requests encrypted?
	const sign = await cryptozoa.sign(JSON.stringify(envelope.contents));
	envelope.seal.publicKey = sign.keys.publicKey;
	envelope.seal.signature = sign.signature;
	
	//console.log("epwd:",encrypted.password);
	
	watch[envelope.id] = {envelope,privateKey:encrypted.keys.privateKey,password:encrypted.password};

	socket.emit("message",envelope);
};
test();





