// import React from "react";
import { QueryClientWrapper } from "./query";

export function Root() {
	return (
		<QueryClientWrapper>
			<App />
		</QueryClientWrapper>
	);
}

// client id
// /api/register?id=xxx&mode=client
// 127.0.0.1:
// let clientId

function App() {
	// fetch("/api/register?" + new URLSearchParams({}));
	return (
		<div className="flex flex-col gap-2 w-full max-w-lg">
			<div className="flex items-center gap-2">
				<button>Rescan</button>
				<span>Connected: false</span>
			</div>
			<table>
				<thead>
					<tr>
						<th>Device</th>
						<th>Mode</th>
						<th>Last available</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>xxx</td>
						<td>server</td>
						<td>2024...</td>
						<td>
							<button disabled>Send</button>
						</td>
						<td>
							<button>Connect</button>
						</td>
					</tr>
					<tr>
						<td>yyy</td>
						<td>client</td>
						<td>2024...</td>
						<td>
							<button disabled>Send</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}
