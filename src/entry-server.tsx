import { webToNodeHandler } from "@hiogawa/utils-node";
import * as v from "valibot";

const RegisterSchema = v.object({
	id: v.string(),
	mode: v.picklist(["client", "server"]),
});

// need to persist to kv
class RoomManager {}

class Peer {}

async function handler(request: Request) {
	const url = new URL(request.url);
	if (!url.pathname.startsWith("/api/")) {
		return;
	}
	if (url.pathname === "/api/register") {
		const result = v.safeParse(
			RegisterSchema,
			Object.fromEntries(url.searchParams),
		);

		getUserAgent;

		request.headers.get("sec-ch-ua-platform");
		request.headers.get("sec-ch-ua");

		// sec-ch-ua-platform:
		// sec-ch-ua:
		// "Chromium";v="131", "Not_A Brand";v="24"

		request.headers.get("user-agent");

		if (!result.success) {
			return Response.json(result, { status: 400 });
		}
		return Response.json(result.output);
	}
	return Response.json({ message: "Not found" }, { status: 404 });
}

function getUserAgent(headers: Headers) {
	const UA_RE = /"(.*?)"/;
	const ua = headers.get("sec-ch-ua")?.match(UA_RE)?.[1];
	const platform = headers.get("sec-ch-ua-platform")?.match(UA_RE)?.[1];
	if (ua && platform) {
		return `${ua} (${platform})`;
	}
	return "Unknown";
}

export default webToNodeHandler(handler);
