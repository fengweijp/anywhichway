# AnyWhichWay - A key-value backed datastore supporting objects, graphs, joins, and processing pipelines.

AnyWhichWay is a JavaScript database that can be backed by almost any key-value store that exposes `get(key)`, `set(key,data)`, `del(key)` or similar methods synchronously or asynchronously. 

It is in an early ALPHA and currently supports:

	1) Graph navigation over fully indexed data.

	2) Object retrieval based on patterns.

	3) Query joins.

	4) Triggers for put/insert, patch/update, and delete.

	5) "Smart" serialization. The database "learns" about new classes as they are inserted and restores data into appropriate class instances.
	
	6) A set of over 30 piped Query commands such as `first(n)`, `last(n)`, `map(f)`, `mapReduce(mapper,reducer)` , `put(object)`, `reduce(f,init)`.

	7) The ability to add new compiled inline graph navigation and piped commands in as little as one line of code.

	8) Inspection and automatic "polyfilling" of passed in storage, e.g. storage can provide `del`, `delete`, `remove`, or `removeItem`.

	9) Security using graph path strings or arrays. This allows the application of security at any level desired, i.e. object, property, and even value.

The key values stores that will not work are those that generate file names for the keys, e.g. node-localstorage. This is because the keys generated internally by AnyWhichWay are often not valid file names.

This version has been tested with: localStorage, Redis, idbkvstore. AnyWhichWay has built in logic to find the appropriate get, set, and delete methods.

The internals of AnyWhichWay are based on asychronous generators to ensure non-blocking return of results as fast as possible. For example, the join command above yields 
one tuple at a time rather than assembling all possible tuples before returning like one usuall does with an SQL store or even with many No-SQL databases that don't support streaming result sets.


# Example Capabilities


1) Graph navigation over fully indexed data supporting:

	a) exact matching, e.g. `get("Person/email/'jsmith@somewhere.com'")` retrieves the Person with the provided e-mail.
	
	b) inline tests, e.g. `get("Person/age/gt(27)")` retrieves all Persons over 27.
	
	c) existing value retrieval, e.g. `get("Person/age")` will return all the possible ages for Persons.
	
	d) wild cards, e.g. `get("*/email/*")`, will retrieve all objects that have an email property, not just Persons.
	
	e) inline functions, e.g. `get("Person/age/(value) => (value > 27 ? value : undefined")` also retrieves all Persons over 27, although more slowly
	
	f) object methods, e.g. `get("Car/#/.makeAndModel()) will return all makeAndModel strings for all Cars.

	
2) Object retrieval based on patterns supporting:

	a) exact matching, e.g. `get({email:"jsmith@somewhere.com"},Person)` retrieves the Person with the provided e-mail.
	
	b) tests, e.g. `get({age:value => value > 27 ? value : undefined,name:"Joe"},Person)` retrieves all Persons over 27 with name "Joe".
	
	c) coerced classes, e.g. `get({email:"jsmith@somewhere.com", instanceof:"Person"})` retrieves the Person with the provided e-mail.
	
3) Object joins supporting:

	a) patterns, e.g. `join({instanceOf:Guest},{instanceOf:Guest},([guest1,guest2]) => guest1["#"]!=guest2["#"] ? [guest1,guest2] : false)` retrieves all possible Guest pairs
	
	b) paths, e.g. `join("Object/age/*","Object/age/*",([a,b]) => a.age && b.age && a.age!==b.age ? [a,b] : false)` retrieves all pairs of differently aged Objects
	
4) Triggers:

	a) e.g. `on({optin:value=>value===true},"put",({type,target,key,value}) => console.log(type,target,key,value)` will log `"put",<some object>,"optin",true` whenever
	an object with the `optin` property set to `true` is added to the database.
	
5) Security using graph path strings or arrays:

	a) `Object/<security rule>` - controls all Objects

	b) `Object/SSN/<security rule>` - controls all SNN property data on all Objects

	c) `Object/name/"Joe"/<security rule>` - controls the the Objects that happen to have the name "Joe"

	d) `["*","*",(value) => (new RegExp('^\\d{3}-?\\d{2}-?\\d{4}$')).test(value)],<security rule>` - controls all data that happens to look like an SSN.


# Installation

`npm install anywhichway`

AnyWhichWay will run in current versions of Chrome and Firefox.

Node v9.7.1 (the most recent at this writing) must be run with the `--harmony` flag. 

Babel transpiled code will not work. Babel does not seem to generate correct asynchronous generators.

# Doumentation Notes

When "Object" is capitalized it refers to a direct instance of the class Object. When "object" is lower case it refers to an instance of any type of class except Array, which uses the term "array".

The property "#" is the default used for unique uuidv4 ids on objects in AnyWhichWay. See the section Metadata for more info.

The property "^" is the default used for object metadata. See the section Metadata for more info.

# Starting The Database

```javascript
const mydb = new Database(localStorage,{inline:true}),
```

or

```javascript
const redis = redis.createClient({
		host:process.env.HOST,
		port:process.env.PORT,
		password:process.env.PWD,
		no_ready_check:true}),
	mydb = new Database(localStorage,{inline:true,promisify:true});
```

# Storing Data

To store an object and have it indexed, just use 'put(object)` at the root level, e.g.

```javascript
mydb.get().put({name:"Joe",age:27}).exec(); // inserts an Object

const p = new Person({name:"Joe",age:27});
mydb.get().put({name:"Joe",age:27}).exec(); // inserts a Person

mydb.get().put({name:"Joe",age:27,instanceof:Person}).exec(); // inserts a Person by coercing the data

```

You can return all the objects inserted instead of just executing:

```javascript
await results = mydb.get().put({name:"Joe",age:27}).put({name:"Mary",age:26}).all(); // inserts an Object

```

You can use AnyWhichWay like a regular key-value store. Just be careful not to use a classname as the key or you will over-write any instances of that class along with the associated index. Best practice is to simply prefix your key path with the something unique e.g. `kv/mykey` vs just `mykey`.


# Graph Navigation

Graph references generally start with a classname followed by a property and a value or another property if the value is itself an object, e.g.

```javascript
{address:{city:"Bainbridge Island",state:"WA",zipcode:{base:98110,plus4:0000}}}
```
is matched by:

```
Object/address/city/"Bainbridge Island"

Object/address/zipcode/base/98110
```

Any location in the path can also be the * wildcard, a compiled inline test, a dynamic inline test, a ".." relative location, e.g.

`Object/address/city/*` - matches any Object with an address and a city property and returns the Object

`Object/address/city` - returns all city names for Objects that have an address property

`Object/address/state/in(["WA","OR"])` - return all objects with addresses in WA or OR

`Object/address/zipcode/base/(value) => (value>=98100 && value<=98199 ? value : undefined)` - return all Objects with an address in the zipcode base range of 98100 to 98199

`Object/address/zipcode/base/between(98100,98199,true)` - alternate way to achieve the above with a compiled inline

`Object/*/(value) => ... some code` - a "table scan" across all Objects and all properties, returns all Objects with property values satisfying the inline

`Object/#/(value) => ... some code` -a "table scan" across all Objects, returns all Objects satisfying the inline

`*/*/(value) => ... some code` - a "table scan" across an entire database, returns all objects satisfying the inline

`*/#/(value) => ... some code` - a "table scan" across instances of all classes, returns all objects satisfying the inline

`Date/month/7/*/..` - get all objects that have an August date as a child, perhaps a birthday.

Tertiary nodes after the "#" selector can be property names or method calls, e.g.

`Car/#/model` - gets all model names for all Cars doing a table scan, `Car/model` is faster.

`Car/#/.makeAndModel()` - However, method names can only be invoked as a result of a table scan.

Data can be retrieved using a graph path, e.g.:

```javascript
get("Object/address/city/*").all();
```

Paths can also be handed in as arrays, e.g.:

```javascript
get(["Object","address","city","*").all();
```

## Notes

Dynamic in-line tests MUST use parentheses around arguments, even if there is just one.

Dynamic in-line tests expose your code to injection risk and must be enabled by setting `inline` to true in the options object when a database connection is created. 
Any in-line test can be added as compiled tests to avoid this issue. See Extending AnyWhichWay.

# Queries

Queries are effectively a series of pipes that change the nature of the results or produce other side-effects.

Queries are initiated using a `get`, `on`, `put`, `patch`

`all()` - Yields the values of a query.

`concat(...args)` - Adds the `args` to the end of the yielded query results.
	
`collect()` - Collects values into an array.

`every(f)` - Yields all values so long as every value satifies `f(value)`.

`filter(f)` - Only yields values for which `f(value)` returns truthy.
		
`first(n=1)` - Only yields the first `n` values down the result chain.
		
`forEach(f)` - Calls `f(value)` for all values.
		
`get(pathsOrPattern)` - See Query Patterns below.
	
`join(...pathsOrPatterns,test)` - Yields arrays of values combinations that satisfy `test(<combination>`. See Joins below.
	
`keys()` - Yields the keys on all values that are objects. Any non-object values are not yielded.
	
`last(n=1)` - Only yields the last `n` values down the result chain.
	
`map(f)` - Yields `f(value)` for each value if receives.

`mapReduce(map,reduce)` - Behaves like MongoDB mapReduce and yields the results for each value it receives.

`merge(query,where)` - Merges the values yielded by another query so long as the values satisfy `where(value)`.

`on(patternOrPath,eventType,callback)` - Ads `callback` as a trigger on `patternOrPath` for the event types `put`, `patch`, `delete`. The callback is
invoked with an event object of the form `{type:"put"|"patch"|"delete",target:object,key:string,value:<any value>}`.

`pop(f)` - Pulls the first value and does not yield it. If `f` is not null calls `f(value)` with the popped value.
	
`provide(...values)` - Yields no values except those in `values`.
	
`push(value)` - Yields `value` into the front of the results.

`put(object,expiration)` - Inserts `object` into the database. If expiration is a number it is a duration and auto increments every time the object is updated. If it is a Date, the expiration is fixed.

`random(float)` - Yields a random percentage of the values it is passed.
	
`reduce(f,initial)` - Yields the result of `<all values>.reduce(f,initial)`.

`reduceRight(f,initial)` Yields the result of `<all values>.reduceRight(f,initial)`.

`reset()` - Abandons any queued commands.

`reverse()` - Yields results in revers order.

`secure(path,security)` - Adds security to the path. See the section on Security.

`seen(f,first)` -

`slice(begin,end)` - Yields just the values between the index `begin` and `end`.

`shift(f)` - Does not yield the last value. If `f` is not null, calls `f(value)` with the last value.

`some(f)` - Yields all values so long as some value satisfies `f(value).

`sort(f)` - Yields values in sorted order based on `f`. If `f` in undefined, yields in alpha sorted order.

`splice(start,deleteCount,...items)` - Yields `items` values after values up to `start` have been yielded and up to `deleteCount` items have not been yielded.

`gt(testValue)` - Yields values that are > `testValue`.

`gte(testValue)` - Yields values that are >= `testValue`.

`eq(testValue,depth)` - Yields values that are == `testValue`. If `depth` > 0, tests objects to the depth. For objects, having equal ids satisfies `eq`.

`between(bound1,bound2,edges)` - Yields values between `bound1` and `bound2`. Optionally allows the value to equal boundary.

`outside(bound1,bound2)` - Yields values outside `bound1` and `bound2`.

`eeq(testValue) - Yields values that are === `testValue`.

`echoes(testVlaue)` - Yields values that sound like `testValue`.

`matches(testValue)` - Yields values that match `testValue` where `testValue` is a RegExp. If `testValue` is a string it is converted into a RegExp.

`contains(testValue)` - Yields values where `value.indexOf(testValue)>=0` so it works on strings and arrays.

`neq(testValue)` - Yields values that are != `testValue`.

`lte(testValue)` - Yields values that are <= `testValue`.

`lt(testValue)` - Yields values that are < `testValue`.

`in(testValue)` - Yields values where `testValue.indexOf(value)>=0` so it works on strings and arrays.

`nin(testValue)` - Yields values where `testValue.indexOf(value)===-1` so it works on strings and arrays.

`not(f)` - Yields values where `!f(value))` is truthy.

# Query Patterns

Query patterns are objects. If the query pattern is an instance of a specific kind of object, then only those kinds of objects will be matched.

Property values in query patterns may be literals or functions that return the value being tested or 'undefined' if they should fail. This behavior may change to a boolean with a BETA release.

```javascript
mydb.get({age:value => value > 27 || undefined,address:{state:WA},instanceof:Person}).all(); // yield all Person's over 27 in the state of Washington.
```

# Joins




# Metadata

The signature of metadata is: `{created:Date,updated:Date,createdBy:uuidv4,updatedBy:uuidv4,expires:Date,lifespan:milliseconds}`.

With the exception of Dates, unique object uuidv4 ids are stored on objects themselves rather than in metadata. Their signature is: `<classname>@<uuidv4>`.

Dates have the id signature `Date@<milliseconds>`.

Note:  Automatic delettion upon expiration is not yet supported.


# Security

All security is expressed using graph paths and a special query command `secure(path,function)`. This allows the application of security at any level desired, e.g.

`get().secure("Object",<security rule>)` - controls all Objects

`get().secure("Object/SSN",<security rule>)` - controls all data stored in SNN property on all Objects

`get().secure("Object/name/"Joe",<security rule>)` - controls the the Objects that happen to have the name "Joe"

`get().secure(["Object","*",(value) => (new RegExp('^\\d{3}-?\\d{2}-?\\d{4}$')).test(value)],<security rule>)` - controls all data that happens to look like an SSN.


Security rules are just a special type of function with the form: 

```
(action,returnValue,storedValue[,key]) => ... your code ... 
```

`action` is one of `get`, `put`, `delete`.

Returning `true` (not just a truthy) will allow the action.

At the moment it is up to the implementor to look-up session ids, user ids and groups if they are needed.

Since the `returnValue` reference is an in memory version, it can be modified, i.e. properties can be deleted or 
their values can be masked for read and eliminated or restored to their current stored value for write. The `storedValue` is frozen and should be
used for reference only. Attempts to change it will result in an error. To ignore changes just use `Object.assign(returnValue,storedValue)`.

# Transactions

Writes of objects that do not contain nested objects or that contain only nested objects of classes that are not registered with schema are atomic and done before indexing. This is somewhat transactional; however, if there is a failure, indexes may be incomplete.

Writes of objects that contain nested objects that are registered as schema are not currently atomic. Each obect is a separate atomic write. If the system fails between these writes, then there could be an inconsistent state and definitely an incomplete index.

All objects are written prior to indexing. Currently schema must be registered every time a database is started using the `register(ctor,name=ctor.name,schema=ctor.schema)` method on the database. Passing `true` as the value for `schema` will force indexing, but no validation will be done on the instances of `ctor`.

The above being said, a base design for full transactional capability has been envisioned and the capability is possible.

# Extending AnyWhichWay

## Predicates

Predicates, e.g. `gt`, `gte`, can be added using the `tests` property on the `options` object when starting a database.

Predicates added this way become usable both in Query patterns and pipelinable query commands.

The below example woud just replace the `outside` predicate with what happens to be the same code as its internal representation

```javascript
function outside(b1,b2) {
	return value => value != b1 && value !=b2 && (b2 > b1 ? value<b1 || value>b2 : value>b1 || value<b2);
}
const db = new Database(store,{tests:{outside}});
```

Note that `outside` returns a function that take a single argument, `value`. This function is invoked by AnyWhichWay with the current value of the data item being tested.
			

# Release History (reverse chronological order)

2018-03-11 - ALPHA enhanced documentation, added events and instanceof support.

2018-03-09 - ALPHA enhanced documentation, added schema validation.

2018-03-08 - ALPHA enhanced documentation, improved relative paths and nested objects.

2018-03-07 - ALPHA Enhanced documentation, pattern matching, joins, and unit tests.

2018-03-04 - ALPHA Publication of major re-write and release track ALPHA.
