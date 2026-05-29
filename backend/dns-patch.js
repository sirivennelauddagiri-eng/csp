const dns = require('dns');

// Intercept +srv connection string and convert to direct replica set URI to bypass resolveSrv failures
if (process.env.MONGO_URI && process.env.MONGO_URI.includes('cleanliness.g3r9imw.mongodb.net')) {
    const originalUri = process.env.MONGO_URI;
    const credsMatch = originalUri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@/);
    if (credsMatch) {
        const user = credsMatch[1];
        const pass = credsMatch[2];
        const directUri = `mongodb://${user}:${pass}@ac-qiv7m4p-shard-00-00.g3r9imw.mongodb.net:27017,ac-qiv7m4p-shard-00-01.g3r9imw.mongodb.net:27017,ac-qiv7m4p-shard-00-02.g3r9imw.mongodb.net:27017/?ssl=true&replicaSet=atlas-pxtz4c-shard-0&authSource=admin&appName=cleanliness`;
        process.env.MONGO_URI = directUri;
        console.log("✈️ Transformed +srv connection string to direct replica set connection string.");
    }
}

try {
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '1.1.1.1']);
    
    // Patch Resolver constructor
    const originalResolver = dns.Resolver;
    dns.Resolver = function() {
        const res = new originalResolver();
        res.setServers(['8.8.8.8', '1.1.1.1']);
        return res;
    };
    dns.Resolver.prototype = originalResolver.prototype;

    // Patch resolveSrv
    const originalResolveSrv = dns.resolveSrv;
    dns.resolveSrv = function(name, callback) {
        resolver.resolveSrv(name, (err, addresses) => {
            if (err) return originalResolveSrv(name, callback);
            callback(null, addresses);
        });
    };

    // Patch resolveTxt
    const originalResolveTxt = dns.resolveTxt;
    dns.resolveTxt = function(name, callback) {
        resolver.resolveTxt(name, (err, addresses) => {
            if (err) return originalResolveTxt(name, callback);
            callback(null, addresses);
        });
    };
    
    // Patch lookup
    const originalLookup = dns.lookup;
    dns.lookup = function(hostname, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        
        resolver.resolve4(hostname, (err, addresses) => {
            if (err || !addresses || addresses.length === 0) {
                return originalLookup(hostname, options, callback);
            }
            callback(null, addresses[0], 4);
        });
    };

    // Patch Promises API
    if (dns.promises) {
        const originalResolveSrvPromise = dns.promises.resolveSrv;
        dns.promises.resolveSrv = async function(name) {
            try {
                const resolverInstance = new dns.Resolver();
                return await resolverInstance.promises.resolveSrv(name);
            } catch (e) {
                return await originalResolveSrvPromise.call(dns.promises, name);
            }
        };

        const originalResolveTxtPromise = dns.promises.resolveTxt;
        dns.promises.resolveTxt = async function(name) {
            try {
                const resolverInstance = new dns.Resolver();
                return await resolverInstance.promises.resolveTxt(name);
            } catch (e) {
                return await originalResolveTxtPromise.call(dns.promises, name);
            }
        };
    }

    console.log("✈️ DNS patch applied: Routing host, SRV, TXT and Resolver class via Google & Cloudflare public DNS.");
} catch (e) {
    console.warn("⚠️ Failed to apply DNS patch:", e.message);
}
