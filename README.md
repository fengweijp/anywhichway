#anywhichway

This repository is an experiment/prototype for:

1) feature exploration related to enhancing the Gun database,

2) testing various JSON indexing approaches,

3) development of JSONBlockStore in the context of higher level needs.

The code is not dependent on Gun, rather it is exposes a Gun-like API.

There is zero focus on packaging.

Unique ids are currently generated using an unreliable random number approach.

This is a temporary repository location. Do not depend on its long term existence.

# Capability

Current interesting capabilities include:

1) A JSONBlockstore for storing all data in one offset and block readable file as native JSON. This is far faster than using separate files for each
object. Without a caching wrapper it has been tested to run at approximately 8K writes and 4.5K record reads per second on a non-SSD drive. With a caching wrapper 
it will appear to run at about 25K reads per second. It appears immune to speed degradation with size. Without caching From 10,000 to 1,000,000 
(admittedly tiny) records it has the same performance on an i5 Windows 10 machine with 8GB RAM. A current limitation of the JSONBlockstore is that
there must be sufficient RAM to keep all object keys in memory with their file offset/block size. For 1,000,000 records this is 46MB
for keys similar to `"#Object#5610914913666407":[0,117,0,37]`. 

2) A layered storage mechanism which makes it simple to add new storage types with automatic caching and "smart" serialization. The classes include:
e.g. MemStore, LocalStore, JSBlockStore, JSONBlockStore, CacheStore, StorageSerializer.

3) "Smart" serialization. The database can "learn" about new classes as they are inserted and restore data into appropriate class instances.

4) A full range of predicates for get(<property>).<predicate>(<value>)... expressions. This makes application code more transparent while also reducing network
traffic. Only data that fully satisfies the predicate test is passed back over the network. Review the unit test file `test/index.js` to see the predicates.

5) Inline collection of matching data, e.g. get(<property>).<predicate>(<value>).collect(<some collection>)...

6) No graph or other structures on top of the application JSON objects. Because the query results are asynchronously provided as they are found, there
is the preception of high performance so long as there is a matching record every 1K records or so. This results in a very small code base around 
which it is easy to prototype. Code unrelated to storage is less than 500 lines. How is this accomplished you may wonder ... queries are actually created
as filters and every time a new object is found in the existing data or inserted all filters are processed. In a client/server model where a server
is typically processing lots of queries, this would be a problem. However, in a peer to peer model where the peers are typically processing a smaller number
of queries this is manageable. Also, to reduce load on a remote peer, requests for matching data are momentary find operations not full blown queries.

7) The beginnings of configurable replication through the specification of `sources` and `sinks`.

# Futures

Additional exploration in the area of domain specialized indexes for JSON objects is being considered.

The benchamrk and unit tests are in the test directory. They can be run without a server. Open the .html files in a browser. Or, run `mocha test/index.js`
and `node test/benchmark.js`
