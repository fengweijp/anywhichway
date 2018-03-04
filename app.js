
const fs = require("fs"),
	path = require("path"),
	cryptozoa = require("cryptozoa"),
	Database = require("./index.js"),
	BlockStore = require("BlockStore"),
	storage = new BlockStore("./blockstore"),
	//storage = new Database.MemStore();
	db = new Database("test",storage); // {encrypt:"password"}// should split database by name into blockstore diretroy subdirectors




//a very basic http static file handler
function handler (request,response) {
	let filepath = request.url.substring(0,(request.url.indexOf("?")>0 ? request.url.indexOf("?") : request.url.length));
    
	console.log(filepath);
	
    if(filepath.indexOf("anywhichway.js")>=0) filepath = "index.js";
    else filepath = "./public" + filepath;
    
    const extname = path.extname(filepath);
    let contenttype;
    switch (extname) {
    	case ".html": 
    		contenttype = "text/html";
    		break;
        case ".js":
            contenttype = "text/javascript";
            break;
        case ".css":
            contenttype = "text/css";
            break;
        case ".gif": 
    		contenttype = "application/gif";
    		break;
        case ".jpeg": 
    		contenttype = "image/jpeg";
    		break;
        case ".jpg": 
    		contenttype = "image/jpeg";
    		break;
        case ".png": 
    		contenttype = "application/png";
    		break;
        case ".ttf": 
    		contenttype = "application/font-sfnt";
    		break;
        case ".woff":
        	contenttype = "application/font-woff";
        	break;
        case ".woff2":
        	contenttype = "application/font-woff";
        	break;
        case ".xml": 
    		contenttype = "text/xml";
    		break;
    }
    
    if(!contenttype) {
    	response.writeHead(404);
        response.end(filepath + " not found"+" ..\n");
        response.end(); 
        return;
    }
    
    fs.readFile(path.normalize([__dirname,filepath].join("/")), function(error, content) {
        if (error) {
        	let message, code;
            if(error.code == "ENOENT"){
            	code = 404;
                message = filepath + " not found"+" ..\n";
            }
            else {
                code = 500;
                message = "Sorry, check with the site admin for error: "+error.code+" ..\n";
            }
            //console.log(code,error.code,path.normalize([__dirname,filepath].join("/")));
            response.writeHead(code);
            response.end(message);
            response.end();
        }
        else {
            response.writeHead(200, { "Content-Type": contenttype  });
            response.end(content, "utf-8");
        }
    });
}

const app = require("http").createServer(handler),
io = require("socket.io")(app);
app.listen(3000,() => console.log("AnyWhichWay listening ..."));

const exposeMetaData = (data,target={},done=new Set()) => {
	if(data && typeof(data)==="object") {
		Object.keys(data).forEach((key) => {
			const value = data[key];
			if(value && typeof(value)==="object") {
				if(done.has(value)) {
					target[key] = {"#": value._["#"]};
				} else {
					done.add(value);
					exposeMetaData(value,target[key]={},done);
				}
			} else {
				target[key] = value;
			}
		});
		Object.defineProperty(target,"_",{enumerable:true,configurable:true,writable:true,value:data._});
	}
	return target;
}
io.on("connection", function(socket) {
	console.log("Connect:",socket.id);
	socket.emit("news", { message: "AnyWhichWay Server Connected" });
	if(db.keys) {
		socket.emit("config",{keys:{publicKey:db.keys.publicKey}});
	} else {
		cryptozoa.keys((keys) => {
			Object.defineProperty(db,"keys",{enumerable:false,configurable:true,writable:true,value:keys});
			socket.emit("config",{keys:{publicKey:db.keys.publicKey}});
		});
	}
		
	socket.on("message",async function(data) {
		console.log(data);
		//return;
		const contents = data.contents,
		id = data.id;
		if(data.seal) {
			if(await cryptozoa.verify(JSON.stringify(data.contents),data.seal.publicKey,data.seal.signature)) {
				// will need to add decryption for match??
				if(contents.match) {
					db.match(contents.match,async (value,key,object,root,time) => {
						console.log(contents.match,JSON.stringify(value));
						const envelope = {
								id:id,
								contents: {},
								credentials: {
									username: "someone@somewhere.com",
									password: "abfdef",
									authToken: "atoken"
								},
								seal: {
									signature: "signature",
									publicKey: "publicKey" // key of the sender
								}
						};
						const encrypted = await cryptozoa.asymmetric.encrypt(JSON.stringify(exposeMetaData(value)),null,contents.publicKey); //"password"
						envelope.contents.data = encrypted.data;
						envelope.contents.password = encrypted.password;
						console.log(encrypted.password);
						const signing = await cryptozoa.sign(encrypted.data);
						envelope.seal.signature = signing.signature;
						envelope.seal.publicKey = signing.keys.publicKey;
						socket.emit("response",envelope);
					},1);
				}
			}		
		} else {
			if(contents.match) {
				db.match(contents.match,async (value,key,object,root,time) => {
					console.log(contents.match,JSON.stringify(value));
					const envelope = {
						id:id,
						contents: {data: exposeMetaData(value)}
					};
					socket.emit("response",envelope);
				},1);
			}
		}
		
	});
	socket.on("disconnect",function() {
		console.log("Disconnect:",socket.id);
	});
});
