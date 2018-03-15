# AnyWhichWay

A JavaScript schema optional extensible key-value backed datastore with element level security supporting query pipelines, graphs, objects, documents, and joins.

AnyWhichWay can be backed by almost any key-value store that exposes `get(key)`, `set(key,data)`, `del(key)` or similar methods synchronously or asynchronously. 

It is in an early ALPHA and currently supports:

1) Graph navigation over fully indexed data.

2) Object retrieval based on patterns.
	
3) Optional schema to support indexing and object validation.

4) Query joins.

5) Triggers for put/insert, patch/update, and delete.

6) "Smart" serialization. The database "learns" about new classes as they are inserted and restores data into appropriate class instances.
	
7) Over 30 piped array like query commands such as `first(n)`, `last(n)`, `map(f)`, `mapReduce(mapper,reducer)` , `pop()`, `reduce(f,init)`.

8) Custom graph navigation and piped commands in as little as one line of code.

9) Inspection and automatic "polyfilling" of passed in storage, e.g. storage can provide `del`, `delete`, `remove`, or `removeItem`.

10) Security using graph path strings or arrays. This allows the application of security at any level desired, i.e. object, property, and even value.
	
11) Automatic data expiration using durations or specific dates.

The key value stores that will not work are those that generate file names for the keys, e.g. node-localstorage. This is because the keys generated internally by AnyWhichWay are often not valid file names.

This version has been tested with: [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) and [idbkvstore](https://github.com/xuset/idb-kv-store) in the browser plus [Redis](https://redis.io/clients) and [blockstore](https://github.com/anywhichway/blockstore) on the server. AnyWhichWay has built in logic to find the appropriate `get`, `set`, and `delete` methods.

Note: `idbkvstore` is currently very slow for `put`. In fact, things will run faster against a remote Redis store.

# Why AnyWhichWay

When processing data in JavaScript, one usually ends-up collecting things into arrays and then processing the arrays to sort, filter, reduce etc. This can consume large amounts of RAM and also means that
result processing can't start until an array is fully populated, particularly with respect to simulating joins. AnyWhichWay provies a full set of array like functions that are actually backed by asynchronous
generators. Even the join processor is an asynchronous generator that processes one tuple at a time. When processing large volumes of data, this ensures the non-blocking return of initial results as fast as possible while limiting RAM usage.

With AnyWhichWay, if you know the functions available on an array you know more than 80% of what is required to query and process data in a manner far more rich than many alternatives with a far smaller footprint. It is currenlty about 12K uncompressed. We anticipate it will be about 20K uncompressed and 12K to 15K compressed when BETA and PRODUCTION are released. Granted, AnyWhichWay is in ALPHA now, so there are also things missing, e.g. conflict resolution, full transaction management.

# Example Capabilities

1) Graph navigation over fully indexed data supporting:

	a) exact matching, e.g. `get("Person/email/'jsmith@somewhere.com'")` retrieves the Person with the provided e-mail.
	
	b) inline tests, e.g. `get("Person/age/gt(27)")` retrieves all Persons over 27.
	
	c) existing value retrieval, e.g. `get("Person/age")` will return all the possible ages for Persons.
	
	d) wild cards, e.g. `get("*/email/*")`, will retrieve all objects that have an email property, not just Persons.
	
	e) inline functions, e.g. `get("Person/age/(value) => value > 27 ? value)` also retrieves all Persons over 27, although more slowly
	
	f) object methods, e.g. `get("Car/#/.makeAndModel()) will return all makeAndModel strings for all Cars.

	
2) Object retrieval based on patterns supporting:

	a) exact matching, e.g. `get({email:"jsmith@somewhere.com"},Person)` retrieves the Person with the provided e-mail.
	
	b) tests, e.g. `get({age:value => value > 27 ? value,name:"Joe"},Person)` retrieves all Persons over 27 with name "Joe".
	
	c) coerced classes, e.g. `get({email:"jsmith@somewhere.com", instanceof:"Person"})` retrieves the Person with the provided e-mail.
	
3) Object joins supporting:

	a) patterns, e.g. `join({instanceof:Guest},{instanceof:Guest},([guest1,guest2]) => guest1["#"]!=guest2["#"] ? [guest1,guest2] : false)` retrieves all possible Guest pairs
	
	b) paths, e.g. `join("Object/age/*","Object/age/*",([a,b]) => a.age && b.age && a.age!==b.age ? [a,b] : false)` retrieves all pairs of differently aged Objects
	
4) Triggers:

	a) e.g. `on({optin:value=>value===true},"put",({type,target,key,value}) => console.log(type,target,key,value)` will log `"put",<some object>,"optin",true` whenever
	an object with the `optin` property set to `true` is added to the database.
	
5) Security using graph path strings or arrays:

	a) `Object/<security rule>` - controls all Objects

	b) `Object/SSN/<security rule>` - controls all SNN property data on all Objects

	c) `Object/name/"Joe"/<security rule>` - controls the the Objects that happen to have the name "Joe"

	d) `["*","*",(value) => (new RegExp('^\\d{3}-?\\d{2}-?\\d{4}$')).test(value)],<security rule>` - controls all data that happens to look like an SSN.
	
6) Data expiration:

	a) `put({passwordResetKey: 12345},30*60*1000})` - inserts a key for password reset that expires and is deleted in 30 minutes.
	
	
# Assist Us

If you like the concept of AnyWhichWay give us a star here on GitHub or npmjs.

Help spread the word by a comment or up vote on [echojs](http://www.echojs.com/news/25933) or a <a href="http://twitter.com/home?status=Looks interesting https://github.com/anywhichway/anywhichway/">Tewwt</a>.


# Installation

`npm install anywhichway`

AnyWhichWay will run in current versions of Chrome and Firefox.

Node v9.7.1 (the most recent at this writing) must be run with the `--harmony` flag. 

Babel transpiled code will not work. Babel does not seem to generate correct asynchronous generators.

# Documentation Notes

When "Object" is capitalized it refers to a direct instance of the class Object. When "object" is lower case it refers to an instance of any type of class except Array, which uses the term "array".

The property "#" is the default used for unique uuidv4 ids on objects in AnyWhichWay. See the section Metadata for more info.

The property "^" is the default used for object metadata. See the section Metadata for more info.

# Starting A Database

Databases are instantiated with 2 arguments, a storage instance and and options object.

```javascript
const mydb = new Database(localStorage,{inline:true,expirationInterval=10*1000}),
```

or

```javascript
const redis = redis.createClient({
		host:process.env.HOST,
		port:process.env.PORT,
		password:process.env.PWD,
		no_ready_check:true}),
	mydb = new Database(redis,{inline:true,promisify:true});
```

The options object supports the following:

`inline` - A boolean flag indicating whether or not to support and compile inline functions in graph paths. Warning: This opens up a code injection risk.

`expirationInterval` - The number of milliseconds between each scan and deletion of expiring data. The default is 30 minutes, i.e. `30*60*1000`. If <= 0, auto expiration is turned off. This can be changed at any time.

`promisify` - Tells the database that the passed in storage uses callbacks that will need to be wrapped with Promises.



# Storing Data

To store an object and have it indexed, just use 'put(object)`, e.g.

```javascript
mydb.query().put({name:"Joe",age:27}).exec(); // inserts an Object

const p = new Person({name:"Joe",age:27});
mydb.query().put({name:"Joe",age:27}).exec(); // inserts a Person

mydb.query().put({name:"Joe",age:27,instanceof:"Person"}).exec(); // inserts a Person by coercing the data

```

You can return all the objects inserted instead of just executing:

```javascript
await results = mydb.get().put({name:"Joe",age:27}).put({name:"Mary",age:26}).all(); // inserts two Objects and yields [{name:"Joe",age:27},{name:"Joe",age:27}]

```

You can also set a duration in milliseconds or expiration date/time with a second argument:

```javascript
mydb.query().put({name:"Joe",age:27},365*24*60*60*1000).exec(); // expires in approximately one year


mydb.query().put({name:"Joe",age:27},new Date("2040/08/01")).exec(); // expires Wed Aug 01 2040 00:00:00
```

Note: Note the default expiration processing interval in AnyWhichWay is 30 minutes, so durations less than 30*60*1000 are not useful unless this is changed.

You can use AnyWhichWay like a regular key-value store. Just be careful not to use a classname as the key or you will over-write any instances of that class along with the associated index. Best practice is to simply prefix your key path with the something unique e.g. `kv/mykey` vs just `mykey`.

Not yet impmented in the ALPHA is `patch`. For now a `delete` followed by a `put` is required.


# Retrieving Data

## Graph Navigation

Data can be retrieved using a graph path, e.g.:

```javascript
mydb.query().get("Object/address/city/*").all();
```

Paths can also be handed in as arrays, e.g.:

```javascript
mydb.query().get(["Object","address","city","*").all();
```

Graph references generally start with a classname followed by a property and a value or another property if the value is itself an object, e.g.

```javascript
{address:{city:"Bainbridge Island",state:"WA",zipcode:{base:98110,plus4:0000}}}
```
is matched by:

```javascript
Object/address/city/"Bainbridge Island"

Object/address/zipcode/base/98110
```

Any location in the path can also be the * wildcard, a compiled inline test, a dynamic inline test, a ".." relative location, e.g.

`Object/address/city/*` - matches any Object with an address and a city property and returns the Object

`Object/address/city` - returns all city names for Objects that have an address property

`Object/address/state/in(["WA","OR"])` - return all objects with addresses in WA or OR

`Object/address/zipcode/base/(value) => value>=98100 && value<=98199)` - return all Objects with an address in the zipcode base range of 98100 to 98199

`Object/address/zipcode/base/between(98100,98199,true)` - alternate way to achieve the above with a compiled inline

`Object/*/(value) => ... some code` - a "table scan" across all Objects and all properties, returns all Objects with property values satisfying the inline

`Object/#/(value) => ... some code` -a "table scan" across all Objects, returns all Objects satisfying the inline

`*/*/(value) => ... some code` - a "table scan" across an entire database, returns all objects satisfying the inline

`*/#/(value) => ... some code` - a "table scan" across instances of all classes, returns all objects satisfying the inline

`Date/month/7/*/..` - get all objects that have an August date as a child, perhaps a birthday.

Tertiary nodes after the "#" selector can be property names or method calls, e.g.

`Car/#/model` - gets all model names for all Cars doing a table scan, `Car/model` is faster.

`Car/#/.makeAndModel()` - However, method names can only be invoked as a result of a table scan.


## Notes

Dynamic in-line tests MUST use parentheses around arguments, even if there is just one.

Dynamic in-line tests expose your code to injection risk and must be enabled by setting `inline` to true in the options object when a database connection is created. 
Any in-line test can be added as compiled tests to avoid this issue. See Extending AnyWhichWay.

It should not be overlooked that by design graph paths can be escaped and passed directly over a network as `get` requests!

## Query Patterns

Query patterns are objects. If the query pattern is an instance of a specific kind of object, then only those kinds of objects will be matched.

Property values in query patterns may be literals or functions that return 'falsy' if they should fail.

```javascript
mydb.query().get({age:value => value > 27,address:{state:WA},instanceof:Person}).all(); // yield all Person's over 27 in the state of Washington.
```

# Queries

Queries are effectively a series of pipes that change the nature of the results or produce other side-effects. Internally, all query commands are wrapped in a generator functions that `yield` each result to the next command.

Queries are initiated using `<db>.query()`.

`all()` - Yields the values of a query as an array.

`assign(object)` - Augments the passed value (which must be an object), the same way the `Object.assign(value,object)` works, and yields the result.

`concat(...args)` - Adds the `args` to the end of the yielded query results.
	
`collect()` - Collects values into an array.

`default(object)` - Works similar to `aasign` except only sets properties that do not already exist.

`delete(pathOrPatternOrId)` - Deletes the specified item. Or, if no argument is provided, deletes the item yielded by the previous step in the query.

`exec()` - Processes the query without yielding any results. Conserves memory as a result.

`every(f)` - Yields all values so long as every value satifies `f(value)`.

`fetch(url,options,done)` - If arguments are provided, fetches the url with the provided options using the value it is passed as the `body`. If `done` is provided as a function, calls `done` with the response and yields the result of that, usually `response.json()`. Otherwise, yields the value it was passed. If no arguments are provided, assumes the passed value will be an object of the form `{url,options[,done]}`.

`filter(f)` - Only yields values for which `f(value)` returns truthy.
		
`first(n=1)` - Only yields the first `n` values down the result chain.
		
`forEach(f)` - Calls `f(value,index)` for all values.

`fork(...queryFragmentFunctions)` - creates multiple yield streams with copies of the value passed to `fork`. If an array is passed and it contains objects, each object is also copied. A `queryFragmentFunction` takes the form:

```javascript
function() { return this.<query command 1>.<query command 2>...<query command n>; } // "this" takes the place of "<database>.query()" and there should be no "all()" or "exec()" at the end.
```
		
`get(pathOrPattern)` - See Query Patterns below.
	
`join(...pathsOrPatterns,test)` - Yields arrays of values combinations that satisfy `test(<array combination>)`. See Joins below.
	
`keys()` - Yields the keys on all values that are objects. Any non-object values are not yielded.
	
`last(n=1)` - Only yields the last `n` values down the result chain.
	
`map(f)` - Yields `f(value,index)` for each value it receives.

`mapReduce(map,reduce)` - Behaves like MongoDB mapReduce and yields the results for each value it receives.

`merge(query,where)` - Merges the values yielded by another query so long as the values satisfy `where(value)`.

`on(pattern,eventType,callback)` - Ads `callback` as a trigger on `pattern` for the event types `put`, `patch`, `delete`. The callback is
invoked with an event object of the form `{type:"put"|"patch"|"delete",target:object,key:string,value:<any value>}`. Notes: In the current ALPHA
only 'put' is supported.

`pop(f)` - Pulls the first value and does not yield it. If `f` is not null calls `f(value)` with the popped value.
	
`provide(...values)` - Yields no values except those in `values`. Effectively replaces the result chain.
	
`push(value)` - Yields `value` into the front of the results.

`put(object,expiration,skip)` - Inserts `object` into the database. If expiration is a number it is a duration and auto increments every time the object is updated. If it is a Date, the expiration is fixed. If `skip` is true, the `object` is not yielded as part of the results.

`random(float)` - Yields a random percentage of the values it is passed.
	
`reduce(f,initial)` - Yields the result of `<all values>.reduce(f,initial)`.

`reduceRight(f,initial)` - Yields the result of `<all values>.reduceRight(f,initial)`.

`render(template)` - Renders each value provided into the `template` and yields `{value,string}`. The `template` should use JavaScript template literal type substitution. The scope is bound to the value passed in.

`reset()` - Abandons any queued commands.

`reverse()` - Yields results in reverse order.

`secure(path,security)` - Adds security to the path. See the section on Security.

`seen(f)` - Calls `f(value)` once for each unique value received but yields all values.

`slice(begin,end)` - Yields just the values between the index `begin` and `end`.

`shift(f)` - Does not yield the last value. If `f` is not null, calls `f(value)` with the last value.

`some(f)` - Yields all values so long as some value satisfies `f(value)`.

`sort(f)` - Yields values in sorted order based on `f`. If `f` is undefined, yields in alpha sorted order.

`splice(start,deleteCount,...items)` - Yields `items` values after values up to `start` have been yielded and up to `deleteCount` items have not been yielded.

`unique()` - Yields only unique values.
 
`unshift(value)` - 

`values()` - Yields all the values of properties on any objects passed down. Does not yield any other values.

`when(test,f)` - When `test(value)` returns truthy, calls `f(value)`.

`yield()` - Assumes an array is being passed from upstream and yields each value separately.
  
`gt(testValue)` - Yields values that are > `testValue`.

`gte(testValue)` - Yields values that are >= `testValue`.

`eq(testValue,depth)` - Yields values that are == `testValue`. If `depth` > 0, tests objects to the depth. For objects, having equal ids satisfies `eq`.

`between(bound1,bound2,edges)` - Yields values between `bound1` and `bound2`. Optionally allows the value to equal boundary.

`outside(bound1,bound2)` - Yields values outside `bound1` and `bound2`.

`eeq(testValue) - Yields values that are === `testValue`.

`echoes(testValue)` - Yields values that sound like `testValue`.

`matches(testValue)` - Yields values that match `testValue` where `testValue` is a RegExp. If `testValue` is a string it is converted into a RegExp.

`contains(testValue)` - Yields values where `value.indexOf(testValue)>=0` so it works on strings and arrays.

`neq(testValue)` - Yields values that are != `testValue`.

`lte(testValue)` - Yields values that are <= `testValue`.

`lt(testValue)` - Yields values that are < `testValue`.

`in(testValue)` - Yields values where `testValue.indexOf(value)>=0` so it works on strings and arrays.

`nin(testValue)` - Yields values where `testValue.indexOf(value)===-1` so it works on strings and arrays.

`not(f)` - Yields values where `!f(value)` is truthy.


# Joins

`join(...pathsOrPatterns,test)` - Yields arrays of value combinations that satisfy `test(<array combination>)`. 

By convention you should destructure the argument to test. The example below will only yield combinations where the names are identical:

```javascript
([object1,object2]) => object1.name && object2.name && object1.name===object2.name);
```


# Metadata

The signature of metadata is: `{created:Date,updated:Date,expires:Date,duration:milliseconds}`.

With the exception of Dates, unique object uuidv4 ids are stored on objects themselves rather than in metadata. Their signature is: `<classname>@<uuidv4>`.

Dates have the id signature `Date@<milliseconds>`.


# Security

All security is expressed using graph paths and a special query command `secure(path,function)`. This allows the application of security at any level desired, e.g.

`secure("Object",<security rule>)` - controls all Objects

`secure("Object/SSN",<security rule>)` - controls all data stored in SNN property on all Objects

`secure("Object/name/"Joe",<security rule>)` - controls the the Objects that happen to have the name "Joe"

`secure(["Object","*",(value) => (new RegExp('^\\d{3}-?\\d{2}-?\\d{4}$')).test(value)],<security rule>)` - controls all data that happens to look like an SSN.


Security rules are just a special type of function with the form: 

```javascript
(action,returnValue,storedValue[,key]) => ... your code ... 
```

`action` is one of `get`, `put`, `delete`.

At the moment it is up to the implementor to look-up session ids, user ids and groups if they are needed.

Since the `returnValue` reference is an in memory version, it can be modified, i.e. properties can be deleted or 
their values can be masked for read and eliminated or restored to their current stored value for write. The `storedValue` is frozen and should be
used for reference only. Attempts to change it will result in an error. To ignore changes just use `Object.assign(returnValue,storedValue)`.

Returning `true` (not just a truthy) will allow the action.

# Transactions

Writes of objects that do not contain nested objects or that contain only nested objects of classes that are not registered with schema are atomic and done before indexing. This is somewhat transactional; however, if there is a failure, indexes may be incomplete.

Writes of objects that contain nested objects that are registered as schema are not currently atomic. Each obect is a separate atomic write. If the system fails between these writes, then there could be an inconsistent state and definitely an incomplete index.

All objects are written prior to indexing. Currently schema must be registered every time a database is started using the `register(ctor,name=ctor.name,schema=ctor.schema)` method on the database. Passing `true` as the value for `schema` will force indexing, but no validation will be done on the instances of `ctor`. As can be seen from the signature for `register`, by convention scheam are defines as static properties on class
definitions; however, this can be changed simply by calling `register` with three arguments.

The above being said, a base design for full transactional capability has been envisioned and the capability is possible.

# Extending AnyWhichWay

## Predicates

Predicates, e.g. `gt`, `gte`, can be added using the `tests` property on the `options` object when starting a database.

Predicates added this way become usable both in Query patterns and pipelinable query commands.

The below example woud just replace the `outside` predicate with what happens to be the same code as its internal representation.

```javascript
function outside(b1,b2) {
	return value => value != b1 && value !=b2 && (b2 > b1 ? value<b1 || value>b2 : value>b1 || value<b2);
}
const db = new Database(store,{tests:{outside}});
```

Note: The function `outside` returns a function that take a single argument, `value`. This function is invoked by AnyWhichWay with the current value of the data item being tested.
			

# Release History (reverse chronological order)

2018-03-14 - ALPHA v0.0.14a tested with `blockstore`, improved `fork`.

2018-03-14 - ALPHA v0.0.13a fixed some string escape issues for `idbkvstore`.

2018-03-13 - ALPHA v0.0.12a enhanced documentation.

2018-03-13 - ALPHA v0.0.11a enhanced documentation, added `assign`, `default`, `fetch`, `fork`.

2018-03-13 - ALPHA v0.0.10a enhanced documentation, added auto expiration, published to NPM.

2018-03-12 - ALPHA v0.0.9a enhanced documentation, published to NPM.

2018-03-11 - ALPHA v0.0.8a delete now working for objects, paths pending.

2018-03-11 - ALPHA improved metadata support, started work on delete.

2018-03-11 - ALPHA enhanced documentation, added events and instanceof support.

2018-03-09 - ALPHA enhanced documentation, added schema validation.

2018-03-08 - ALPHA enhanced documentation, improved relative paths and nested objects.

2018-03-07 - ALPHA Enhanced documentation, pattern matching, joins, and unit tests.

2018-03-04 - ALPHA Publication of major re-write and release track ALPHA.

# License

MIT License

Copyright (c) 2018 Simon Y. Blackwell, AnyWhichWay, LLC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
