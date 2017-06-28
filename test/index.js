//async function test() {
var Database, JSONBlockStore, expect;
if(typeof(window)==="undefined") {
	Database = require("../index.js");
	JSONBlockStore = require("../lib/JSONBlockStore.js");
	expect = require("chai").expect;
}

let storage;
if(JSONBlockStore) {
	storage = new JSONBlockStore("./blockstore","#key",true);
	//storage = new Database.LocalStore();
} else {
	storage = new Database.LocalStore();
}
storage.clear();

class Address {};
class Cell {
	constructor(value) {
		this.value  = value;
	}
}
const collection = [];
const db = new Database("test",storage),
	c1 = Object.assign(new Address(),{city:"Seattle",state:"WA"}),
	o1 = {firstName:"Joe",lastName:"Jones",age:27,address:c1,favoriteNumbers:[1,2,3],notes:"is a great guy"};
o1.self = o1;
db.peer(new Database.RemoteDatabase(db,"127.0.0.1"));
db.register(Address);
db.register(Cell);

console.log("Adding test data ....")
db.put(o1);

describe("get",function() {
	it("should get root edge",function(done) {
		db.get("firstName").on((value,key,object) => {
			expect(value).to.equal("Joe");
			expect(key).to.equal("firstName");
			//expect(object).to.deep.equal(o1);
			done();
		})
	});
	it("should match where",function(done) {
		db.where({firstName:"Joe",age:{$gte: 27},lastName:{$: (value) => value==="Jones"}}).on((value,key,object) => {
			expect(value.firstName).to.equal("Joe");
			expect(value.lastName).to.equal("Jones");
			expect(value.age>=27).to.equal(true);
			//expect(object).to.deep.equal(o1);
			done();
		
		})
	});
	it("should match RegExp",function(done) {
		db.get("firstName").matches("Joe").on((value,key,object) => {
			expect(value).to.equal("Joe");
			expect(key).to.equal("firstName");
			//expect(object).to.deep.equal(o1);
			done();
		
		})
	});
	it("should echo",function(done) {
		db.get("firstName").echoes("Jo").on((value,key,object) => {
			expect(value).to.equal("Joe");
			expect(key).to.equal("firstName");
			//expect(object).to.deep.equal(o1);
			done();
		
		})
	});
	it("should match search",function(done) {
		db.get("notes").search("GREAT",false).on((value,key,object) => {
			expect(value).to.equal("is a great guy");
			expect(key).to.equal("notes");
			//expect(object).to.deep.equal(o1);
			done();
		
		})
	});
	it("should patch lastName",function(done) {
		db.get("lastName").patch("Johnson").on((value,key,object) => {
			expect(value).to.equal("Johnson");
			expect(key).to.equal("lastName");
			db.sinks[0].get(object["#key"]).then(result => {
				expect(result.lastName).to.equal("Johnson");
				done();
			})
		})
	});
	it("should patch/create",function(done) {
		db.get("A").get("1").patch({value:10,format:"$${value}}"},"Cell").on(function(value,key,object) {
			expect(value.value).to.equal(10);
			db.sinks[0].get(object["#key"]).then(result => {
				expect(result[1].value).to.equal(10);
				done();
			})
		})
	});
	it("should add city",function(done) {
		db.get("address").put({city:"LA"}).on((value,key,object) => {
			expect(value.city).to.equal("LA");
			expect(key).to.equal("address");
			db.sinks[0].get(object["#key"]).then(result => {
				expect(result.address.city).to.equal("LA");
				expect(result.address["#key"]).to.equal(value["#key"]);
				done();
			});
		})
	});
	it("should get nested edge",function(done) {
		let count = 0;
			executed = false;
		db.get("address").get("city").on((value,key,object) => {
			expect(value).to.be.oneOf(["Seattle","LA"]);
			expect(key).to.equal("city");
			if(++count===2 && !executed) {
				executed = true;
				done();
			}
		})
	});
	it("should collect",function(done) {
		let count = 0;
			executed = false;
		db.get("address").get("city").collect(collection).on((value,key,object) => {
			expect(value).to.be.oneOf(["Seattle","LA"]);
			expect(key).to.equal("city");
			if(++count===2 && !executed) {
				expect(collection.length).to.equal(2);
				executed = true;
				done();
			}
		})
	});
	it("should uncollect",function(done) {
		db.get("address").get("city").eeq("LA").uncollect(collection).on((value,key,object) => {
			expect(value).to.be.oneOf(["Seattle","LA"]);
			expect(key).to.equal("city");
			expect(collection.length).to.equal(1);
			done();
		})
	});
	it("should add object",function(done) {
		db.get("tasks").get("task one").put({title:"task one"}).on((value,key,object) => {
			expect(value.title).to.equal("task one");
			db.sinks[0].get(object["#key"]).then(result => {
				done();
			})
		})
	});
	it("should match instanceof",function(done) {
		db.get("address").instanceof("Address").on((value,key,object) => {
			expect(key).to.equal("address");
			done();
		})
	});
	it("should match type",function(done) {
		db.get("age").typeof("number").on((value,key,object) => {
			expect(value).to.equal(27);
			expect(key).to.equal("age");
			done();
		})
	});
	it("should be lt",function(done) {
		db.get("age").lt(28).on((value,key,object) => {
			expect(value).to.equal(27);
			expect(key).to.equal("age");
			done();
		})
	});
	it("should be lte",function(done) {
		db.get("age").lte(27).on((value,key,object) => {
			expect(value).to.equal(27);
			expect(key).to.equal("age");
			done();
		})
	});
	it("should be eq",function(done) {
		db.get("age").eq("27").on((value,key,object) => {
			expect(value).to.equal(27);
			expect(key).to.equal("age");
			done();
		})
	});
	it("should be between by range",function(done) {
		db.get("age").gt(26).lt(28).on((value,key,object) => {
			expect(value).to.equal(27);
			expect(key).to.equal("age");
			done();
		})
	});
	it("should be between by predicate",function(done) {
		db.get("age").between(26,28).on((value,key,object) => {
			expect(value).to.equal(27);
			expect(key).to.equal("age");
			done();
		})
	});
	it("should be outside by predicate",function(done) {
		db.get("age").outside(20,25).on((value,key,object) => {
			expect(value).to.equal(27);
			expect(key).to.equal("age");
			done();
		})
	});
	it("should be gte",function(done) {
		db.get("age").gte(27).on((value,key,object) => {
			expect(value).to.equal(27);
			expect(key).to.equal("age");
			done();
		})
	});
	it("should be gt",function(done) {
		db.get("age").gt(26).on((value,key,object) => {
			executed = true;
			expect(value).to.equal(27);
			expect(key).to.equal("age");
			done();
		})
	});
	it("should include",function(done) {
		db.get("favoriteNumbers").includes(2).on((value,key,object) => {
			expect(value.length).to.equal(3);
			done();
		})
	});
	it("should exclude",function(done) {
		db.get("favoriteNumbers").excludes(5).on((value,key,object) => {
			expect(value.length).to.equal(3);
			done();
		})
	});
	it("should be in",function(done) {
		db.get("age").in([26,27,28]).on((value,key,object) => {
			expect(value).to.equal(27);
			done();
		})
	});
	it("should not be in",function(done) {
		db.get("age").nin([28,29,30]).on((value,key,object) => {
			expect(value).to.equal(27);
			done();
		})
	});
	it("should map array",function(done) {
		db.get("favoriteNumbers").map().on((value,key,object) => {
			expect(value.length).to.equal(3);
			done();
		})
	});
	it("should map array with function",function(done) {
		db.get("favoriteNumbers").map((value,i) => (i<2 ? value : undefined)).on((value,key,object) => {
			expect(value.length).to.equal(2);
			done();			
		})
	});
	it("should map array with function and continuation",function(done) {
		db.get("favoriteNumbers").map((value,i) => (i<2 ? value : undefined)).get("length").eq(2).on((value,key,object) => {
			expect(object.length).to.equal(2);
			expect(value).to.be.oneOf(o1.favoriteNumbers);
			done();				
		})
	});
	it("should map object",function(done) {
		db.get("address").map((value,key,object) => { if(value==="LA") return value; }).on((value,key,object) => {
			expect(value.city).to.equal("LA");
			done();	
		})
	});
	it("should support inline",function(done) {
		db.get("firstName").call("substring",1).on((value,key,object) => {
			expect(value).to.equal("oe");
			expect(key).to.equal("firstName");
			done();	
		})
	});
});


