var chai,
	expect,
	Database,
	localStorage,
	redis;
if(typeof(window)==="undefined") {
	chai = require("chai");
	expect = chai.expect;
	Database = require("../index.js");
	const LocalStorage = require('node-localstorage').LocalStorage;
	localStorage = new LocalStorage('./scratch');
	redis = require("redis");
}

//const store = localStorage,

let store = (redis ? redis.createClient({
	host:"redis-15154.c10.us-east-1-3.ec2.cloud.redislabs.com",
	port:15154,
	password:process.env.PWD,
	no_ready_check:true}) : localStorage);
//store = new IdbKvStore("scratch");

if(store.on) {
	store.on("error",error => console.log(error))
	store.on("set",data => console.log(data))
}


const perf = [],
	db0 = new Database(store,{inline:true,expirationInterval:10*1000,promisify:(redis ? true : false)}),
	noperf = true,
	cycles = 500;
db0.storage.clear();
perf.run = async function() {
	if(noperf) return;
	for(let test of this) {
		start = performance.now();
		let i=test.cycles=test.cycles||cycles;
		while(i--) {
			await test.fn();
		}
		const duration = performance.now() - start;
		test.speed = ((test.cycles||cycles)/duration)*1000;
		console.log(test);
	}
}
const benchmark = (test) => { if(test.name[0]==="#") perf.push(test); }

function Car(config) {
	Object.assign(this,config);
}
Car.prototype.makeAndModel = function() { return `${this.brand}:${this.model}`; }
Car.schema = {
		brand: (value) => typeof(value)==="string",
		model: (value) => typeof(value)==="string"
}
const c1 = new Car({brand:"Audi",model:"A4"}),
	c2 = new Car({brand:"Ford",model:"Expedition"});



const init = db0.query().put({enrolled:new Date("August 19, 1975 23:15:30"),age:27,name:"Joe",secret:"wink!",SSN:"999-99-9999",car:c1})
	.put({name:"John",secret:"wink!",SSN:"999-99-9999",address:{city:"Seattle",zipcode:{base:98101,plus4:0001}},car:c2})
	.put({name:"John",age:29,secret:"wink!",SSN:"999-99-9999"}).all();
db0.register(Date,Date.name,true);
db0.register(Car);

const now = new Date();

describe("Test",function () {
	it("test",function (done) {
		const test = async () => 1;
		test()
			.then(result => { expect(result).to.equal(1); done(); perf.push({name:this.test.title,fn:test})}).catch(e => done(e))
	});
	it(` db0.query().put(new Car({brand:"Jaguar"})).all()`,function() {
		const test  = eval("()=>"+this.test.title.substring(1));
		return test()
			.then(() => expect.fail("expected TypeError"))
			.catch(e => {
				this.test.title += " does not insert ";
				expect(e).to.be.instanceof(Error);
			});
	});
	it(` db0.query().put(new Car({brand:"Jaguar",model:"XK8"}),now).get("Metadata/expires/gte(${now})").all()`,function(done) {
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				done();
				perf.push({name:this.test.title,fn:test})})
			.catch(e => done(e))
	});
	it(` db0.query().delete({brand:"Ford",instanceof:"Car"}).all()`,function(done) {
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				done();
				perf.push({name:this.test.title,fn:test})})
			.catch(e => done(e))
	});
	it(`secure all Object secrets secure("Object",(action,returnValue) => { if(returnValue.secret) delete returnValue.secret; return true; })`,function(done) {
		let test = () => db0.query().secure("Object",(action,returnValue) => { if(returnValue.secret) delete returnValue.secret; return true; }).all();
		test()
			.then(result => {
				done();
				perf.push({name:this.test.title,fn:test})})
			.catch(e => done(e))
	});
	it(`mask all SNN secure(["*","*",(value) => (new RegExp('^\\d{3}-?\\d{2}-?\\d{4}$')).test(value)],(action,returnValue,storedValue,key) => {  returnValue[key]="***-**-****"; return true;  })`,function(done) {
		let test = () => db0.query().secure(["Object","*",(value) => (new RegExp('^\\d{3}-?\\d{2}-?\\d{4}$')).test(value)],(action,returnValue,storedValue,key) => { returnValue[key]="***-**-****"; return true; }).all();
		test()
			.then(result => {
				done();
				perf.push({name:this.test.title,fn:test})})
			.catch(e => done(e))
	});
	it(`_ db0.query().get("Object/#/*").all()`,function(done) {
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				this.test.title += " = " + JSON.stringify(result);
				for(let object of result) {
					if(object.SSN) expect(object.SSN).to.equal("***-**-****");
				}
				done()})
			.catch(e => done(e))
	});
	it(`# db0.query().get("Date/*/../*/").all()`,function(done) {
		const test  = eval("()=>"+this.test.title.substring(1));
		test().then(result => {
				expect(new Date(result[0].enrolled)+""==new Date("August 19, 1975 23:15:30")+"").to.equal(true);
				this.test.title += " = " + JSON.stringify(result);
				done(); 
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get("Date/month/7/*/..").all()`,function(done) {
		const test  = eval("()=>"+this.test.title.substring(1));
		test().then(result => {
				expect(result[0].enrolled+""==new Date("August 19, 1975 23:15:30")).to.equal(true);
				this.test.title += " = " + JSON.stringify(result);
				done(); 
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	
	it(`# db0.query().get("Date/*/../*/age/27").all()`,function(done) {
		const test  = eval("()=>"+this.test.title.substring(1));
		test().then(result => {
				expect(result[0].age).to.equal(27);
				this.test.title += " = " + JSON.stringify(result);
				done(); 
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get("Car/brand/'Audi'").all()`,function(done) {
		const test  = eval("()=>"+this.test.title.substring(1));
		test().then(result => {
				expect(result[0] instanceof Car).to.equal(true);
				this.test.title += " = " + JSON.stringify(result);
				done(); 
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get({brand:"Audi",instanceof:"Car"}).all()`,function(done) {
		const test  = () => db0.query().get({brand:"Audi",instanceof:"Car"}).all();
		test().then(result => {
				expect(result[0] instanceof Car).to.equal(true);
				this.test.title += " = " + JSON.stringify(result);
				done(); 
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get("Car/#/.makeAndModel()").all()`,function(done) {
		const test  = eval("()=>"+this.test.title.substring(1));
		test().then(result => {
				expect(result[0]).to.equal("Audi:A4");
				this.test.title += " = " + JSON.stringify(result);
				done(); 
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().put({put:1}).put({put:2}).get({put:(value) => value}).all()`,function (done) {
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(2);
				this.test.title = test + " = " + JSON.stringify(result);
				done(); 
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get("*/age").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.includes(27) && result.includes(29)).to.equal(true);
				this.test.title += " = " + JSON.stringify(result);
				done(); 
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get("*/age").filter(value => value > 27).all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => { expect(result.length).to.equal(1); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	}); 
	it(`# db0.query().get("*/age/*").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => { expect(result.length).to.equal(2);
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get('*/age/gt(27)').all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => { 
				expect(result.length).to.equal(1); 
				expect(result[0].age>27).to.equal(true); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get({age:27,name:"Joe"}).all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => { 
				expect(result.length).to.equal(1); 
				expect(result[0].age).to.equal(27);
				expect(result[0].name).to.equal("Joe");
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get({age:(value) => value > 27}).all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => { 
				expect(result.length).to.equal(1); 
				expect(result[0].age>27).to.equal(true); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get('*/age/(value) => value > 27').all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1);
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get('*/name/echoes("Jo")').all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1);
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get('*/name/"John"').all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(2);
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get("*/name/*").filter(object => object.name==="Joe").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	}); 
	it(`# db0.query().get('Object/#/*').filter(object => object.name==="Joe").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1);
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get("*/name").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(2); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get("*/name/*").first().all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	}); 
	it(`# db0.query().get("*/name").last().all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	}); 
	it(`# db0.query().get("*/name").shift().all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get("*/name").unshift("Jack").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(3);
				expect(result[0]).to.equal("Jack");
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.query().get("*/name/*").some(value => value.name==="Joe").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(3); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	}); 
	it(` db0.query().provide(1,2,3,3,4,5,6,6).all()`,function (done) { 
		const test =  eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(8);
				this.test.title += " = " + JSON.stringify(result);
				done()}) 
			.catch(e => done(e))
	});
	it(` db0.query().provide([1,2,3,3,4,5,6,6]).yield().all()`,function (done) { 
		const test =  eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(8); 
				this.test.title += " = " + JSON.stringify(result);
				done()})
			.catch(e => done(e))
	});
	it(` db0.query().provide(1,2,3,3,4,5,6,6).unique().all()`,function (done) { 
		const test = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(6);
				this.test.title += " = " + JSON.stringify(result);
				done()})
			.catch(e => done(e))
	});
	it(` db0.query().provide(6,6,5,4,3,3,2,1).sort().all()`,function (done) { 
		const test = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(8);
				expect(result[0]).to.equal(1);
				expect(result[7]).to.equal(6);
				this.test.title += " = " + JSON.stringify(result);
				done()})
			.catch(e => done(e))
	});
	it(` db0.query().provide(1,2,3,3,4,5,6,6).when(value => value===5,() => passed = true).all()`,function (done) {
		let passed;
		const test  = () => db0.query().provide(1,2,3,3,4,5,6,6).when(value => value===5,() => passed = true).all();
		test()
			.then(result => {
				expect(result.length).to.equal(8);
				expect(passed).to.equal(true);
				this.test.title += " = " + JSON.stringify(result);
				done()})
			.catch(e => done(e))
	});
	it(` db0.query().on({optin:value=>value===true},"put",(...args) => passed = args).put({optin:true}).all()`,function (done) {
		let passed;
		const test  = () => db0.query().on({optin:value=>value===true},"put",(...args) => passed = args).put({optin:true}).all();
		test()
			.then(result =>
				setTimeout(() => {
					expect(Array.isArray(passed)).to.equal(true);
					this.test.title += " = " + JSON.stringify(result);
					done();
				}))
			.catch(e => done(e))
	});
	it(` will occassionaly fail since testing random! db0.get().provide(0,1,2,3,4,5,6,7,8,9.10,11,12,13,14,15,16,17,18,19).random(.5).all()`,function (done) {
		const test = db0.query().provide(0,1,2,3,4,5,6,7,8,9.10,11,12,13,14,15,16,17,18,19).random(.5).all();
		test.then(result => {
				expect(result.length>=8 && result.length<=12).to.equal(true);
				this.test.title += " = " + JSON.stringify(result);
				done()})
			.catch(e => done(e))
	});
	it(` db0.query().join("Object/age/*","Object/age/*",([a,b]) => a.age && b.age && a.age!==b.age ? [a,b] : undefined).all()`,function (done) {
		const test = eval("()=>"+this.test.title.substring(1));
		test().then(result => {
				expect(result.length).to.equal(1);
				this.test.title += " = " + JSON.stringify(result);
				done()})
			.catch(e => done(e))
	});
	it(` db0.query().provide({name:"Joe",age:27}).values().all()`,function (done) {
		const test = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(2);
				expect(result[0]).to.equal("Joe");
				expect(result[1]).to.equal(27);
				this.test.title += " = " + JSON.stringify(result);
				done()})
			.catch(e => done(e))
	});
	it(` db0.query().provide({name:"Joe",age:27}).keys().all()`,function (done) {
		const test = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(2);
				expect(result[0]).to.equal("name");
				expect(result[1]).to.equal("age");
				this.test.title += " = " + JSON.stringify(result);
				done()})
			.catch(e => done(e))
	});
	const predicates1 = {
			gt: [28,27],
			gte: [28,27],
			eq: [28,28],
			eeq: [28,28],
			neq: [28,27],
			matches: ["Joe",/Joe/],
			echoes: ["Jo","Joe"],
			between: [1,0,2],
			outside: [3,0,2],
			lte: [27,28],
			lt: [27,28],
			in: [1,[0,1,2]],
			nin: [-1,[0,1,2]]
	};
	for(let fname in predicates1) {
		const f = Database.tests[fname],
			[value,...args] = predicates1[fname];
		if(f) {
			const type = typeof(value);
			let nvalue = value;
			if(type==="string") nvalue = JSON.stringify(value)
			else if(value && type==="object") nvalue = JSON.stringify(value);
			it(`${fname} provide(${nvalue}).${fname}(${args.map(arg => typeof(arg)==="string" || (arg && typeof(arg)==="object") ? JSON.stringify(arg) : arg).join(",")})`,function (done) {
				let test = () => db0.query().get().provide(value)[fname](...args).all();
				test()
					.then(result => {
						expect(result[0]).to.equal(value);
						this.test.title += " = " + JSON.stringify(result);
						done();
					})
					.catch(e => done(e))
			});
		}
	}
	const o1 = {name:"Joe",address:{state:"WA"}},
  o2 = {name:"Joe",address:{state:"WA"}},
	predicates2 = {
		eq: [o1,o2,2],
		between: [1,0,2,true]
	};
	for(let fname in predicates2) {
		const f = Database.tests[fname],
			[value,...args] = predicates2[fname];
		if(f) {
			const type = typeof(value);
			let nvalue = value;
			if(type==="string") nvalue = JSON.stringify(value)
			else if(value && type==="object") nvalue = JSON.stringify(value);
			it(`${fname} provide(${nvalue}).${fname}(${args.map(arg => typeof(arg)==="string" || (arg && typeof(arg)==="object") ? JSON.stringify(arg) : arg).join(",")})`,function (done) {
				let test = () => db0.query().provide(value)[fname](...args).all();
				test()
					.then(result => {
						expect(result[0]).to.equal(value);
						this.test.title += " = " + JSON.stringify(result);
						done()})
				.catch(e => done(e))
			});
		}
	}
	/*it("speed test put",function (done) {
		let test  = () => db0.get().put({speed:1}).all();
		const me = this;
		test()
			.then(async result => {
				let i=cycles;
				const start = Date.now();
				while(i--) {
					await test();
				}
				const duration = Date.now() - start;
				console.log((cycles/duration)*1000);
				done();
			})
	});*/
});
/**
 *  These are all the events you can subscribe to:
 *   - `start`  execution started
 *   - `end`  execution complete
 *   - `suite`  (suite) test suite execution started
 *   - `suite end`  (suite) all tests (and sub-suites) have finished
 *   - `test`  (test) test execution started
 *   - `test end`  (test) test completed
 *   - `hook`  (hook) hook execution started
 *   - `hook end`  (hook) hook complete
 *   - `pass`  (test) test passed
 *   - `fail`  (test, err) test failed
 */ 

if(typeof(mocha)!=="undefined") {
	init.then(() => {
		const runner = mocha.run();
		runner.on("end",() => {
			perf.run();
		});
	});
}