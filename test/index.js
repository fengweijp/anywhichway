//async function test() {
var Database,cryptozoa, expect;

let storage;
if(typeof(window)==="undefined") {
	const BlockStore = require("blockstore");
	expect = require("chai").expect;
	Database = require("../index.js");
	cryptozoa = require("cryptozoa");
		
	storage = new BlockStore("./blockstore");
	//storage = new Database.LocalStore();
	//const CloudStore = require("./lib/CloudStore.js");
	//storage = new CloudStore("test");
} else {
	storage = new Database.LocalStore();
}
storage.clear();

//console.log(storage.constructor.name)

class Address {
	isCool() {
		return this.city === "Seattle";
	}
};
class Cell {
	constructor(value) {
		this.value  = value;
	}
}

const db = new Database("test",storage,{index:true}), // ,{encrypt:"password"}
	c1 = Object.assign(new Address(),{city:"Seattle",state:"WA"}),
	o1 = {firstName:"Joe",lastName:"Jones",age:27,anniversary:new Date(2008,7,1),address:c1,favoriteNumbers:[1,2,3],notes:"is a great guy",infinity:Infinity,NaN:NaN};
o1.self = o1;
//db.peer(new Database.RemoteDatabase(db,"127.0.0.1",new CacheStore(null,{keyPath:"_.#"})));
db.register(Address);
db.register(Cell);

describe("queries",function() {
	var lastnames = [],
		notvisited = ["Seattle"],
		uberPattern = {
			firstName:"Joe",
			//$not: {
			//	$isNaN: "age"
			//},
			age: {$gt: 26, $gte: 27, $eq: 27, $eeq: 27, $neq: 26, $neeq: 26, $lte: 27, $lt: 28, $in: [25,26,27], $nin: [28,29,30], $typeof: "number", $between: [26,28], $outside: [20,26]},
			$isArray: "favoriteNumbers",
			favoriteNumbers: {$typeof: "object", $isArray: null, $includes: 1, $excludes: 10, $intersects: [2,3], $coincident: [3,2,1], $disjoint: [4,5,6], $map: (array) => array, $every: (item) => item < 4, $some: (item) => item > 0 },
			lastName:{
				$: (value) => value==="Jones",
				$echoes: "Jons",
				$matches: "Jones",
				$not: {
					$eq: "Johnston"
				},
				$collect: lastnames,
				$set: "Johnston"
			},
			address: {
				$instanceof: Address,
				$$isCool: null,
				city: {
					$in: ["LA","Seattle"],
					$nin: ["New York"],
					$uncollect: notvisited
				},
				state: {
					$set: "NY"
				}
			},
			infinity: Infinity,
			NaN: {$isNaN: null},
			$define: "vitals",
			vitals: {
				$set: {pulse: 60, temp: 98.8}
			}
		};
	it("should put",function(done) {
		db.put(o1).then(() => {
			db.get(o1._["#"]).then(result => {
				expect(o1._["#"]).to.equal(result._["#"]);
				done();
			}); 
		});
	}).timeout(5000);
	it("should match universal where",function(done) {
		const pattern = Object.assign({},uberPattern);
		pattern["$on"] = (value,key,object) => {
			expect(value.firstName).to.equal("Joe");
			expect(value.age>=27).to.equal(true);
			expect(lastnames[0]==="Jones");
			expect(notvisited.length===0);
			done();
		}
		db.match(pattern);
	});
	it("should match date parts and parent",function(done) {
		db.match({
			year: 2008,
			"$..": {age: 27},
			$on: (value,key,object) => {
				expect(value.getFullYear()).to.equal(2008);
				done();
			}
		})
	});
	it("should match new embedded object",function(done) {
		db.match({
			vitals: {pulse: 60},
			$on: (value,key,object) => {
				expect(value.vitals.pulse).to.equal(60);
				done();
			}
		})
	});
	it("should match root changes",function(done) {
		db.match({
			lastName: "Johnston",
			$on: (value,key,object) => {
				expect(value.lastName).to.equal("Johnston");
				done();
			}
		})
	});
	it("should match child changes",function(done) {
		db.match({
			address: {
				state: "NY",
				$on: (value,key,object) => {
					expect(value.state).to.equal("NY");
					done();
				}
			}
		})
	});
	it("should match indirect changes",function(done) {
		db.match({
			state: "NY",
			$on: (value,key,object) => {
				expect(value.state).to.equal("NY");
				done();
			}
		})
	});
	it("should sterilize level 1",function(done) {
		const pattern = Object.assign({},uberPattern);
		pattern["$on"] = (value,key,object) => console.log(value,key,object);
		const query = new Database.Query(db,pattern),
			sterilized = query.sterilized(1),
			str = JSON.stringify(sterilized);
		expect(str.indexOf("$on")).to.equal(-1);
		expect(str.indexOf("$set")).to.equal(-1);
		expect(str.indexOf("$collect")).to.equal(-1);
		expect(str.indexOf("$uncollect")).to.equal(-1);
		expect(sterilized.firstName).to.equal("Joe");
		done();
	});
	it("should sterilize level 2",function(done) {
		const pattern = Object.assign({},uberPattern);
		pattern["$on"] = (value,key,object) => console.log(value,key,object);
		const query = new Database.Query(db,pattern),
			sterilized = query.sterilized(2),
			str = JSON.stringify(sterilized);
		expect(str.indexOf("$on")).to.equal(-1);
		expect(str.indexOf("$set")).to.equal(-1);
		//expect(sterilized.indexOf("$")).to.equal(-1);
		expect(str.indexOf("$map")).to.equal(-1);
		expect(str.indexOf("$every")).to.equal(-1);
		expect(str.indexOf("$some")).to.equal(-1);
		expect(sterilized.firstName).to.equal("Joe");
		done();
	});
	it("should sterilize level 3",function(done) {
		const pattern = Object.assign({},uberPattern);
		pattern["$on"] = (value,key,object) => console.log(value,key,object);
		const query = new Database.Query(db,pattern),
			sterilized = query.sterilized(3),
			str = JSON.stringify(sterilized);
		expect(str.indexOf("$on")).to.equal(-1);
		expect(str.indexOf("$set")).to.equal(-1);
		//expect(sterilized.indexOf("$")).to.equal(-1);
		expect(str.indexOf("$map")).to.equal(-1);
		expect(str.indexOf("$every")).to.equal(-1);
		expect(str.indexOf("$some")).to.equal(-1);
		expect(str.indexOf("$$")).to.equal(-1);
		expect(sterilized.firstName).to.equal("Joe");
		done();
	});
	it("should sterilize level 4",function(done) {
		const pattern = Object.assign({},uberPattern);
		pattern["$on"] = (value,key,object) => console.log(value,key,object);
		const query = new Database.Query(db,pattern),
			sterilized = query.sterilized(4),
			str = JSON.stringify(sterilized);
		expect(str.indexOf("$")).to.equal(-1);
		expect(sterilized.firstName).to.equal("Joe");
		done();
	});
	it("should put with custom id", function(done) {
		const t1 = {test:"test"};
		db.put(t1,"A1").then(() => {
			db.storage.get("#Object#A1").then((data) => {
				console.log(t1._,data)
				expect(data.test).to.equal("test");
				expect(data._["#"]).to.equal("#Object#A1");
				done();
			});
		});
	});
	it("should match search",function(done) {
		db.get("notes").search("GREAT",false).on((value,key,object) => {
			expect(value).to.equal("is a great guy");
			expect(key).to.equal("notes");
			//expect(object).to.deep.equal(o1);
			done();
		
		})
	});
});


