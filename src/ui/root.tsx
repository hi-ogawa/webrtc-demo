import { createTinyForm } from "@hiogawa/tiny-form";
import { useMutation } from "@tanstack/react-query";
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
		this.pc.addEventListener("negotiationneeded", () => {
			this.pc.setLocalDescription();
		});
		this.pc.addEventListener("icecandidate", (e) => {
			if (e.candidate) {
				this.pc.addIceCandidate(e.candidate);
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

	useMutation;
	// const connectMutation = useMutation({
	// 	mutationFn: async () => {
	// 		manager.connect();
	// 	},
	// });
	// connectMutation.isPending;
	// fetch("/api/register");

	const form = createTinyForm(
		React.useState({
			remoteDescription: "",
		}),
	);

	return (
		<div className="flex flex-col gap-2 w-full max-w-lg">
			<div className="flex flex-col gap-2">
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
					Register
				</button>
				<div className="flex flex-col gap-2">
					<textarea {...form.fields.remoteDescription.props()} />
					<button
						onClick={async () => {
							await manager.pc.setRemoteDescription(
								JSON.parse(form.data.remoteDescription),
							);
							await manager.pc.setLocalDescription();
						}}
					>
						Connect
					</button>
				</div>
				<pre>{JSON.stringify(state.connection, null, 2)}</pre>
			</div>
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
