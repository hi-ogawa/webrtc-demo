import { createTinyForm } from "@hiogawa/tiny-form";
import { tinyassert } from "@hiogawa/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { QueryClientWrapper } from "./query";

export function Root() {
	return (
		<QueryClientWrapper>
			<App />
		</QueryClientWrapper>
	);
}

class WebrtcManager {
	pc: RTCPeerConnection;
	state!: {
		connection: Pick<
			RTCPeerConnection,
			| "localDescription"
			| "remoteDescription"
			| "connectionState"
			| "signalingState"
			| "iceConnectionState"
			| "iceGatheringState"
		>;
	};
	channel?: RTCDataChannel;

	constructor() {
		this.pc = new RTCPeerConnection({
			iceServers: [
				// https://www.metered.ca/blog/list-of-webrtc-ice-servers/
				{ urls: "stun:stun.l.google.com:19302" },
			],
		});

		if (window.location.search.includes("debug")) {
			for (const eventName of [
				"connectionstatechange",
				"datachannel",
				"icecandidate",
				"icecandidateerror",
				"iceconnectionstatechange",
				"icegatheringstatechange",
				"negotiationneeded",
				"signalingstatechange",
				"track",
			] satisfies (keyof RTCPeerConnectionEventMap)[]) {
				this.pc.addEventListener(eventName, (event) => {
					console.log(`[debug:${eventName}]`, event);
				});
			}
		}

		for (const eventName of [
			"signalingstatechange",
			"connectionstatechange",
			"icegatheringstatechange",
		] satisfies (keyof RTCPeerConnectionEventMap)[]) {
			this.pc.addEventListener(eventName, () => {
				this.updateState();
			});
		}
		// TODO: need to share icecandidate events too?
		this.pc.addEventListener("icecandidate", (e) => {
			if (e.candidate) {
				// this.pc.addIceCandidate(e.candidate);
			}
		});
		this.pc.addEventListener("datachannel", (e) => {
			const channel = e.channel;
			channel.addEventListener("open", (e) => {
				console.log("[channel.onopen]", e);
				channel.send("Hello from receiver");
			});
			channel.addEventListener("message", (e) => {
				console.log("[channel.onmessage]", e);
			});
		});
		this.updateState();
	}

	updateState() {
		this.state = {
			connection: {
				localDescription: this.pc.localDescription,
				remoteDescription: this.pc.remoteDescription,
				connectionState: this.pc.connectionState,
				signalingState: this.pc.signalingState,
				iceConnectionState: this.pc.iceConnectionState,
				iceGatheringState: this.pc.iceGatheringState,
			},
		};
		console.log(this.state.connection);
		this.notify();
	}

	// API for useSyncExternalStore
	listeners = new Set<() => void>();

	subscribe = (listener: () => void) => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};

	notify() {
		for (const listener of this.listeners) {
			listener();
		}
	}

	getSnapshot = () => this.state;
}

const manager = new WebrtcManager();

function App() {
	const state = React.useSyncExternalStore(
		manager.subscribe,
		manager.getSnapshot,
	);

	const registerMutation = useMutation({
		mutationFn: async () => {
			const descriptionReady = new Promise((resolve, reject) => {
				manager.pc.addEventListener(
					"negotiationneeded",
					async function handler() {
						manager.pc.removeEventListener("negotiationneeded", handler);
						manager.pc.setLocalDescription().then(resolve, reject);
					},
				);
			});
			const channel = manager.pc.createDataChannel("webrtc-demo");
			channel.addEventListener("open", (e) => {
				console.log("[channel.onopen]", e);
				channel.send("Hello from sender");
			});
			channel.addEventListener("message", (e) => {
				console.log("[channel.onmessage]", e);
			});
			await descriptionReady;
			const res = await fetch("/api/register", {
				method: "POST",
				body: JSON.stringify({
					name: form.data.name,
					description: manager.pc.localDescription,
				}),
			});
			tinyassert(res.ok);
		},
		onSettled() {
			// discoverQuery.refetch();
		},
	});

	const connectMutation = useMutation({
		mutationFn: async (remoteDescription: RTCSessionDescriptionInit) => {
			const descriptionReady = new Promise<void>((resolve, _reject) => {
				manager.pc.addEventListener(
					"iceconnectionstatechange",
					function handler() {
						if (manager.pc.iceConnectionState === "checking") {
							manager.pc.removeEventListener(
								"iceconnectionstatechange",
								handler,
							);
							resolve();
						}
					},
				);
			});
			await manager.pc.setRemoteDescription(remoteDescription);
			await manager.pc.setLocalDescription();
			await descriptionReady;
			const res = await fetch("/api/register", {
				method: "POST",
				body: JSON.stringify({
					name: form.data.name,
					// TODO: needs to wait for signalingstatechange etc...?
					description: manager.pc.localDescription,
				}),
			});
			tinyassert(res.ok);
		},
		onSettled() {
			// discoverQuery.refetch();
		},
	});

	// const discoverQuery = useQuery({
	// 	queryKey: ["/api/discover"],
	// 	queryFn: async () => {
	// 		const res = await fetch("/api/discover");
	// 		return (await res.json()) as any[];
	// 	},
	// 	refetchInterval: 5000,
	// });

	const form = createTinyForm(
		React.useState({
			name: "",
			remoteDescription: "",
		}),
	);

	// debug
	if (1) {
		return (
			<div className="flex flex-col gap-4 w-full max-w-lg mx-auto items-start p-2">
				<h1 className="text-xl">WebRTC Test</h1>
				<div className="flex w-full">
					<div className="flex-1 flex flex-col gap-2 items-center">
						<h4>Offer</h4>
						<button
							onClick={() => {
								const channel = manager.pc.createDataChannel("webrtc-demo");
								channel.addEventListener("open", (e) => {
									console.log("[channel.onopen]", e);
									channel.send("Hello from sender");
								});
								channel.addEventListener("message", (e) => {
									console.log("[channel.onmessage]", e);
								});
							}}
						>
							1. createDataChannel
						</button>
						<button
							onClick={() => {
								manager.pc.setLocalDescription();
							}}
						>
							3. setLocalDescription
						</button>
						<button
							onClick={() => {
								const result = window.prompt("setRemoteDescription");
								if (result) {
									manager.pc.setRemoteDescription(JSON.parse(result));
								}
							}}
						>
							6. setRemoteDescription
						</button>
					</div>
					<div className="flex-1 flex flex-col gap-2 items-center">
						<h4>Answer</h4>
						<button
							onClick={() => {
								manager.pc.addEventListener("datachannel", (e) => {
									const channel = e.channel;
									channel.addEventListener("open", (e) => {
										console.log("[channel.onopen]", e);
										channel.send("Hello from receiver");
									});
									channel.addEventListener("message", (e) => {
										console.log("[channel.onmessage]", e);
									});
								});
							}}
						>
							2. listen "datachannel"
						</button>
						<button
							onClick={() => {
								const result = window.prompt("setRemoteDescription");
								if (result) {
									manager.pc.setRemoteDescription(JSON.parse(result));
								}
							}}
						>
							4. setRemoteDescription
						</button>
						<button
							onClick={() => {
								manager.pc.setLocalDescription();
							}}
						>
							5. setLocalDescription
						</button>
					</div>
				</div>
				{/* TODO: not needed? */}
				{/* <button
					onClick={() => {
						const result = window.prompt("addIceCandidate");
						if (result) {
							manager.pc.addIceCandidate(JSON.parse(result));
						}
					}}
				>
					addIceCandidate
				</button> */}
				<div>
					<h4>RTCPeerConnection</h4>
					<pre className="break-all whitespace-pre-wrap">
						{JSON.stringify(state.connection, null, 2)}
					</pre>
				</div>
				<div>
					{/* TODO */}
					<h4>RTCIceCandidate</h4>
					<pre className="break-all whitespace-pre-wrap">
						{JSON.stringify([], null, 2)}
					</pre>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 w-full max-w-lg">
			<div className="flex flex-col gap-2">
				<div>
					<input {...form.fields.name.props()} />
					<button
						onClick={() => {
							registerMutation.mutate();
						}}
					>
						Register
					</button>
				</div>
				<div className="flex flex-col gap-2">
					<textarea {...form.fields.remoteDescription.props()} />
					<button
						onClick={() => {
							connectMutation.mutate(JSON.parse(form.data.remoteDescription));
						}}
					>
						Connect
					</button>
				</div>
				<pre>{JSON.stringify(state.connection, null, 2)}</pre>
			</div>
			{/* <pre>{JSON.stringify(discoverQuery.data, null, 2)}</pre> */}
			{false && <MockApp />}
		</div>
	);
}

function MockApp() {
	return (
		<div className="flex flex-col gap-2 w-full max-w-lg">
			<div className="flex items-center gap-2">
				<button>Register</button>
			</div>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Registered at</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>John</td>
						<td>Sun Jan 05 2025 15:46:55 GMT+0900 </td>
						<td>
							<button>Connect</button>
						</td>
					</tr>
					<tr>
						<td>Joe</td>
						<td>Sun Jan 05 2025 15:46:55 GMT+0900 </td>
						<td>
							<button>Connect</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}
