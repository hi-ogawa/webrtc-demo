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

	return (
		<div className="flex flex-col gap-4 w-full max-w-lg mx-auto items-start p-2">
			<h1 className="text-xl">WebRTC Tester</h1>
			<div className="flex w-full">
				<div className="flex-1 flex flex-col gap-2 items-center">
					<h4>Caller</h4>
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
						2. setLocalDescription
					</button>
					<button
						onClick={() => {
							const result = window.prompt(
								"Copy 'localDescription' from 'Answer' side",
							);
							if (result) {
								manager.pc.setRemoteDescription(JSON.parse(result));
							}
						}}
					>
						6. setRemoteDescription
					</button>
				</div>
				<div className="flex-1 flex flex-col gap-2 items-center">
					<h4>Callee</h4>
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
						3. listen "datachannel"
					</button>
					<button
						onClick={() => {
							const result = window.prompt(
								"Copy 'localDescription' from 'Offer' side",
							);
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
			<button
				hidden
				onClick={() => {
					const result = window.prompt("addIceCandidate");
					if (result) {
						manager.pc.addIceCandidate(JSON.parse(result));
					}
				}}
			>
				addIceCandidate
			</button>
			<div>
				<h4>RTCPeerConnection</h4>
				<pre className="text-xs break-all whitespace-pre-wrap">
					{JSON.stringify(state.connection, null, 2)}
				</pre>
			</div>
			<div>
				{/* TODO */}
				<h4>RTCIceCandidate</h4>
				<pre className="text-xs break-all whitespace-pre-wrap">
					{JSON.stringify([], null, 2)}
				</pre>
			</div>
			{/* TODO: channel message */}
		</div>
	);
}
