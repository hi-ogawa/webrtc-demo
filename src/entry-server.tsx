import { webToNodeHandler } from "@hiogawa/utils-node";

async function handler(request: Request) {
	const url = new URL(request.url);
	if (!url.pathname.startsWith("/api/")) {
		return;
	}
	return new Response("hello api: " + request.url);
}

export default webToNodeHandler(handler);
