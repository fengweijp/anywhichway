# AnyWhichWay

AnyWhichWay is a JavaScript database that can be backed by almost any key-value store that exposes `get(key)`, `set(key,data)`, `del(key)` or similar methods synchronously or asynchronously. 

Although AnyWhichWay doesn't change what's possible with a database, we think it makes things simpler.

The key values stores that will not work are those that generate file names for the keys, e.g. node-localstorage. This is because the keys generated internally by AnyWhichWay are often not valid file names.

This version has been tested with: localStorage, Redis, idbkvstore. AnyWhichWay has build in logic to find the appropriate get, set, and delete methods.

It is in an early ALPHA and currently supports:


1) Graph navigation over fully indexed data:

	a) with exact matching, e.g. `get("Person/email/'jsmith@somewhere.com'")` retrieves the Person with the provided e-mail.
	
	b) with inline tests, e.g. `get("Person/age/gt(27)")` retrieves all Persons over 27.
	
	c) with property existing value retrieval, e.g. `get("Person/age")` will return all the possible ages for Persons.
	
	d) with wild cards, e.g. `get("*/email/*")`, will retrieve all objects that have an email property, not just Persons.
	
	e) with inline functions, e.g. `get("Person/age/(value) => (value > 27 ? value : undefined")` also retrieves all Persons over 27, although more slowly
	
	f) with object methods, e.g. `get("Car/#/.makeAndModel()) will return all makeAndModel strings for all Cars.

	
2) Object retrieval based on patterns:

	a) with exact matching, e.g. `get({email:"jsmith@somewhere.com"},Person)` retrieves the Person with the provided e-mail.
	
	b) with tests, e.g. `get({age:value => value > 27 ? value : undefined,name:"Joe"},Person)` retrieves all Persons over 27 with name "Joe".
	
	c) with coerced classes, e.g. `get({email:"jsmith@somewhere.com", instanceof:"Person"})` retrieves the Person with the provided e-mail.
	
3) Object joins:

	a) e.g. `join({instanceOf:Guest},{instanceOf:Guest},([guest1,guest2]) => guest1["#"]!=guest2["#"] ? [guest1,guest2] : false)` retrieves all possible Guest pairs
	
	b) e.g. `join("Object/age/*","Object/age/*",([a,b]) => a.age && b.age && a.age!==b.age ? [a,b] : false)` retrieves all pairs of differntly aged Objects
	
4) "Smart" serialization. The database "learns" about new classes as they are inserted and restores data into appropriate class instances.
	
5) A set of over 30 piped Query commands such as `first(n)`, `last(n)`, `map(f)`, `mapReduce(mapper,reducer)` , `put(object)`, `reduce(f,init)`.

6) The ability to add new compiled inline graph and piped commands in as little as one line of code.

7) Inspection and automatic "polyfilling" of passed in storage, e.g. storage can provide `del`, `delete`, `remove`, or `removeItem`.

8) Security using graph path strings or arrays. This allows the application of security at any level desired, e.g.

	a) `Object/<security rule>` - controls all Objects

	b) `Object/SSN/<security rule>` - controls all SNN property data on all Objects

	c) `Object/name/"Joe"/<security rule>` - controls the the Objects that happen to have the name "Joe"

	d) `["*","*",(value) => (new RegExp('^\\d{3}-?\\d{2}-?\\d{4}$')).test(value)],<security rule>` - controls all data that happens to look like an SSN.


The internals of AnyWhichWay are based on asychronous generators to ensure non-blocking return of results as fast as possible. For example, the join command above yields 
one tuple at a time rather than assembling all possible tuples before returning like one must do with an SQL store or even with many No-SQL databases that don't support streaming result sets.


# Installation

`npm install anywhichway`

AnyWhichWay will run in current versions of Chrome and Firefox.

Node v9.7.1 (the most recent at this writing) must be run with the `--harmony` flag. 

Babel transpiled code will not work. Babel does not seem to generate correct asynchronous generators.

# Doumentation Notes

When "Object" is capitalized it refers to a direct instance of the class Object. When "object" is lower case it refers to an instance of any type of class except Array, which uses the term "array".

The property "#" is the default used for unique uuidv4 ids on objects in AnyWhichWay. See the section Metadata for more info.

The property "^" is the default used for object metadata. See the section Metadata for more info.


# Basic Example


# Storing Data

You can use AnyWhichWay like a regular key-value store. Just be careful not to use a classname as the key or you will over-write any instances of that class along with the associated index. Best practice is to simply prefix your key path with the something unique e.g. `kv/mykey` vs just `mykey`.


To store an object and have it indexed, just use 'put(object)` at the root level, e.g.

```javascript
mydb.get().put({name:"Joe",age:27}).exec(); // inserts an Object

const p = new Person({name:"Joe",age:27});
mydb.get().put({name:"Joe",age:27}).exec(); // inserts a Person

mydb.get().put({name:"Joe",age:27,instanceof:Person}).exec(); // inserts a Person by coercing the data

```

Multiple objects can be inserted at once:

```javascript
mydb.get().put({name:"Joe",age:27},{name:"Mary",age:26).exec(); // inserts an Object

```

You can return all the objects inserted instead of just executing:

```javascript
await results = mydb.get().put({name:"Joe",age:27},{name:"Mary",age:26).all(); // inserts an Object

```

# Graph Navigation

Graph references generally start with a classname followed by a property and a value or another property if the value is itself an object, e.g.

```
{address:{city:"Bainbridge Island",state:"WA",zipcode:{base:98110,plus4:0000}}}

Object/address/city/"Bainbridge Island"

Object/address/zipcode/base/98110
```

Any location in the path can also be the * wildcard, a compiled inline test, a dynamic inline test, e.g.


`Object/address/city/*` - matches any Object with an address and a city property and returns the Object

`Object/address/city` - returns all city names for Objects that have an address property

`Object/address/state/in(["WA","OR"])` - return all objects with addresses in WA or OR

`Object/address/zipcode/base/(value) => (value>=98100 && value<=98199 ? value : undefined)` - return all Objects with an address in the zipcode base range of 98100 to 98199

`Object/address/zipcode/base/between(98100,98199,true)` - alternate way to achieve the above with a compiled inline

`Object/*/(value) => ... some code` - the equivalent of a table scan across all Objects and all properties, returns all Objects with property values satisfying the inline

`Object/#/(value) => ... some code` - the equivalent of a table scan across all Objects, returns all Objects satisfying the inline


`*/#/(value) => ... some code` - the equivalent of a table scan across instances of all classes, returns all objects satisfying the inline

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

Dynamic in-line tests MUST use parentheses around agruments, even if there is just one.

Dynamic in-line tests expose the code to injection risk and must be enabled by setting `inline` to true in the options object when a database connection is created. 
Any in-line test can be added as compiled tests to avoid this issue. See Extending AnyWhichWay.

# Queries

Queries are effectively a series of pipes that change the nature of the results or produce other side-effects.

async all() {

	concat
	collect() {

	every(f) {

	filter(f) {
		
	first(n=1) {
		
	forEach(f) {
		
	get(...pathsOrPatterns) {
	
	join(...pathsOrPatterns,test)
	
	keys() {
	
	last(n=1) {
	
	map(f) {

	mapReduce(map,reduce) {

	merge(query,where) {

	pop() {
	
	provide(...values) {
	
	push(value) {

	put(...data) {

	random(pct) {
	
	reduce(f,initial) {

	reduceRight(f,initial) {

	reset() {

	reverse() {

	secure(path,security) {

	seen(f,first) {

	slice(begin,end) {

	shift() {

	some(f) {

	sort(f) {

	splice(start,deleteCount,...items) {


gt
VM28835:1 gte
VM28835:1 eq
VM28835:1 between
VM28835:1 outside
VM28835:1 eeq
VM28835:1 echoes
VM28835:1 matches
VM28835:1 contains
VM28835:1 neq
VM28835:1 lte
VM28835:1 lt
VM28835:1 in
VM28835:1 nin
VM28835:1 not

# Query Patterns

Query patterns are objects. If the query pattern is an instance of a specific kind of object, then only those kinds of objects will be matched.

Property values in query patterns may be literals or functions that return the value being tested or 'undefined' if they should fail. This behavior may change to a boolean with a BETA release.


# Metadata

The signature of metadata is: `{created:Date,updated:Date,createdBy:uuidv4,updatedBy:uuidv4,expires:Date,lifespan:milliseconds}`.

Unique object uuidv4 ids are stored on objects themselves rather than in metadata. Their signature is: `<classname>@<uuidv4>`.


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
used for reference only. Attempts to change it will result in an error.

# Extending AnyWhichWay

# Release History (reverse chornological order)

2018-03-07 - Enhanced documentation, pattern matching, joins, and unit tests.

2018-03-04 - Publication of major re-write and release track ALPHA.
