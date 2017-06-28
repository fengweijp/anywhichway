(function() {
	class MemStore {
		constructor() {
			this.data = {};
		}
		async clear() {
			this.data = {};
		}
		async count() {
			return Object.keys(this.data).length;
		}
		async delete(id) {
			delete this.data[id];
		}
		async get(id) {
			const data = this.data[id];
			if(data) return JSON.parse(data);
		}
		async key(number) {
			return Object.keys(this.data)[number];
		}
		async set(id,data) {
			this.data[id] = JSON.stringify(data);
			return id;
		}
	}
	if(typeof(module)!=="undefined") {
		module.exports = MemStore;
	}
	if(typeof(window)!=="undefined") {
		window.MemStore = MemStore;
	}
}).call(this);