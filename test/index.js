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
	password:"XOkWYD7hT5NDDljQRwb6slwmOQvTnBpF",
	no_ready_check:true}) : localStorage);
//store = new IdbKvStore("scratch");

if(store.on) {
	store.on("error",error => console.log(error))
	store.on("set",data => console.log(data))
}


const perf = [],
	db0 = new Database(store,{inline:true,root:"root",promisify:(redis ? true : false)}),
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

const init = db0.get().put({age:27,name:"Joe",secret:"wink!",SSN:"999-99-9999"},{name:"John",secret:"wink!",SSN:"999-99-9999"},{name:"John",age:29,secret:"wink!",SSN:"999-99-9999"},new Car({brand:"Audi"})).all();
//db0.register(Car);


describe("Test",function () {
	it("test",function (done) {
		const test = async () => 1;
		test()
			.then(result => { expect(result).to.equal(1); done(); perf.push({name:this.test.title,fn:test})}).catch(e => done(e))
	});
	it(`secure all Object secrets secure("Object",(action,returnValue) => { if(returnValue.secret) delete returnValue.secret; return true; })`,function(done) {
		let test = () => db0.get().secure("Object",(action,returnValue) => { if(returnValue.secret) delete returnValue.secret; return true; }).all();
		test()
			.then(result => {
				done();
				perf.push({name:this.test.title,fn:test})})
			.catch(e => done(e))
	});
	it(`mask all SNN secure(["*","*",(value) => (new RegExp('^\\d{3}-?\\d{2}-?\\d{4}$')).test(value)],(action,returnValue,storedValue,key) => {  returnValue[key]="***-**-****"; return true;  })`,function(done) {
		let test = () => db0.get().secure(["Object","*",(value) => (new RegExp('^\\d{3}-?\\d{2}-?\\d{4}$')).test(value)],(action,returnValue,storedValue,key) => { returnValue[key]="***-**-****"; return true; }).all();
		test()
			.then(result => {
				done();
				perf.push({name:this.test.title,fn:test})})
			.catch(e => done(e))
	});
	it(`_ db0.get("Object/#/*").all()`,function(done) {
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
	it(`# db0.get("Car/brand/'Audi'").all()`,function(done) {
		const test  = eval("()=>"+this.test.title.substring(1));
		test().then(result => {
				expect(result[0] instanceof Car).to.equal(true);
				this.test.title += " = " + JSON.stringify(result);
				done(); 
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.get().put({put:1},{put:2}).all()`,function (done) {
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(2);
				this.test.title = test + " = " + JSON.stringify(result);
				done(); 
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.get("*/age").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.includes(27) && result.includes(29)).to.equal(true);
				this.test.title += " = " + JSON.stringify(result);
				done(); 
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.get("*/age").filter(value => value > 27).all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => { expect(result.length).to.equal(1); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	}); 
	it(`# db0.get("*/age/*").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => { expect(result.length).to.equal(2);
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	}); 
	it(`# db0.get('*/age/gt(27)').all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => { 
				expect(result.length).to.equal(1); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.get('*/age/(value) => value > 27').all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1);
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.get('*/name/echoes("Jo")').all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1);
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.get('*/name/"John"').all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(2);
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.get("*/name/*").filter(object => object.name==="Joe").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	}); 
	it(`# db0.get('Object/#/*').filter(object => object.name==="Joe").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1);
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.get("*/name").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(2); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.get("*/name/*").first().all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	}); 
	it(`# db0.get("*/name").last().all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	}); 
	it(`# db0.get("*/name").shift().all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(1); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	});
	it(`# db0.get("*/name").unshift("Jack").all()`,function (done) { 
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
	it(`# db0.get("*/name/*").some(value => value.name==="Joe").all()`,function (done) { 
		const test  = eval("()=>"+this.test.title.substring(1));
		test()
			.then(result => {
				expect(result.length).to.equal(3); 
				done();
				this.test.title += " = " + JSON.stringify(result);
				benchmark({name:this.test.title,fn:test});})
			.catch(e => done(e))
	}); 
	it(`provide 8 provide(1,2,3,3,4,5,6,6)`,function (done) { 
		const test  = () => db0.get().provide(1,2,3,3,4,5,6,6).all();
		test()
			.then(result => {
				expect(result.length).to.equal(8); 
				done()}) 
			.catch(e => done(e))
	});
	it(`provide 8 provide([1,2,3,3,4,5,6,6]).yield()`,function (done) { 
		const test  = () => db0.get().provide([1,2,3,3,4,5,6,6]).yield().all();
		test()
			.then(result => {
				expect(result.length).to.equal(8); 
				done()})
			.catch(e => done(e))
	});
	it(`provide 6 unique provide(1,2,3,3,4,5,6,6).unique()`,function (done) { 
		const test  = () => db0.get().provide(1,2,3,3,4,5,6,6).unique().all();
		test()
			.then(result => {
				expect(result.length).to.equal(6); 
				done()})
			.catch(e => done(e))
	});
	it(`provide [1,2,3,3,4,5,6,6] provide(6,6,5,4,3,3,2,1).sort()`,function (done) { 
		const test  = () => db0.get().provide(6,6,5,4,3,3,2,1).sort().all();
		test()
			.then(result => {
				expect(result.length).to.equal(8);
				expect(result[0]).to.equal(1);
				expect(result[7]).to.equal(6);
				done()})
			.catch(e => done(e))
	});
	it(`when side effect provide(1,2,3,3,4,5,6,6).when(value => value===5,() => passed = true)`,function (done) {
		let passed;
		const test  = () => db0.get().provide(1,2,3,3,4,5,6,6).when(value => value===5,() => passed = true).all();
		test()
			.then(result => {
				expect(result.length).to.equal(8);
				expect(passed).to.equal(true);
				done()})
			.catch(e => done(e))
	});
	it(`values ["Joe",27] provide({name:Joe",age:27}).values()`,function (done) {
		let passed;
		const test  = () => db0.get().provide({name:"Joe",age:27}).values().all();
		test()
			.then(result => {
				expect(result.length).to.equal(2);
				expect(result[0]).to.equal("Joe");
				expect(result[1]).to.equal(27);
				done()})
			.catch(e => done(e))
	});
	it(`keys ["name","age"] provide({name:Joe",age:27}).keys()`,function (done) {
		let passed;
		const test  = () => db0.get().provide({name:"Joe",age:27}).keys().all();
		test()
			.then(result => {
				expect(result.length).to.equal(2);
				expect(result[0]).to.equal("name");
				expect(result[1]).to.equal("age");
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
				let test = () => db0.get().provide(value)[fname](...args).all();
				test()
					.then(result => {
						expect(result[0]).to.equal(value);
						done()})
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
				let test = () => db0.get().provide(value)[fname](...args).all();
				test()
					.then(result => {
						expect(result[0]).to.equal(value);
						done()})
				.catch(e => done(e))
			});
		}
	}
	it("speed test put",function (done) {
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
	});
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



