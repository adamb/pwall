				import worker, * as OTHER_EXPORTS from "/Users/adam/code/pwall/src/index.js";
				import * as __MIDDLEWARE_0__ from "/Users/adam/.nodenv/versions/18.17.1/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts";
import * as __MIDDLEWARE_1__ from "/Users/adam/.nodenv/versions/18.17.1/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts";
				
				worker.middleware = [
					__MIDDLEWARE_0__.default,__MIDDLEWARE_1__.default,
					...(worker.middleware ?? []),
				].filter(Boolean);
				
				export * from "/Users/adam/code/pwall/src/index.js";
				export default worker;