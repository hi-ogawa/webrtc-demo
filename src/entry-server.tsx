import { webToNodeHandler } from "@hiogawa/utils-node";

// TODO: persist to kv
// TODO: keep only latest entries
// TODO: separate by remote IP?
const peers: Record<string, any> = {};

async function handler(request: Request) {
	const url = new URL(request.url);
	if (!url.pathname.startsWith("/api/")) {
		return;
	}
	if (url.pathname === "/api/register" && request.method === "POST") {
		const payload = await request.json();
		peers[payload.name] = payload.description;
		return Response.json({ ok: true });
	}
	if (url.pathname === "/api/discover") {
		return Response.json(peers);
	}
	return Response.json({ message: "Not found" }, { status: 404 });
}

export default webToNodeHandler(handler);
