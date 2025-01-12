import React from "react";

// references
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation

export function Root() {
	return <App />;
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
		candidates: (RTCIceCandidate | null)[];
	};
	candidates: (RTCIceCandidate | null)[] = [];

	constructor() {
		this.pc = new RTCPeerConnection({
			iceServers: [
				// https://www.metered.ca/blog/list-of-webrtc-ice-servers/
				{
					urls: ["stun:stun.l.google.com:19302", "stun:stun.l.google.com:5349"],
				},
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

		this.pc.addEventListener("icecandidate", (e) => {
			this.candidates.push(e.candidate);
			this.updateState();
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
			candidates: this.candidates,
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

function useDataChannel() {
	const [channel, setChannel] = React.useState<RTCDataChannel>();
	const [state, setState] = React.useState<RTCDataChannelState>();
	const [messages, setMessages] = React.useState<unknown[]>([]);

	React.useEffect(() => {
		if (!channel) return;
		for (const eventName of [
			"open",
			"close",
			"closing",
			"error",
		] satisfies (keyof RTCDataChannelEventMap)[]) {
			channel.addEventListener(eventName, () => {
				setState(channel.readyState);
			});
		}

		channel.addEventListener("message", (e) => {
			setMessages((v) => [...v, e.data]);
			setState(channel.readyState);
		});
	}, [channel]);

	return [channel, setChannel, messages, state] as const;
}

function App() {
	const state = React.useSyncExternalStore(
		manager.subscribe,
		manager.getSnapshot,
	);

	const [channel, setChannel, channelMessages] = useDataChannel();

	return (
		<div className="flex flex-col gap-4 w-full max-w-lg mx-auto items-start p-2">
			<h1 className="text-xl">WebRTC Tester</h1>
			<div className="flex w-full">
				<div className="flex-1 flex flex-col gap-2 items-center">
					<h4>Caller</h4>
					<button
						onClick={() => {
							const channel = manager.pc.createDataChannel("webrtc-demo");
							setChannel(channel);
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
								"Copy 'localDescription' from 'Callee' side",
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
								setChannel(channel);
							});
						}}
					>
						3. listen "datachannel"
					</button>
					<button
						onClick={() => {
							const result = window.prompt(
								"Copy 'localDescription' from 'Caller' side",
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
			<div className="flex flex-col gap-1">
				<h4>DataChannel</h4>
				<form
					action={(formData) => {
						if (!channel) return;
						channel.send(String(formData.get("message")));
					}}
				>
					<input name="message" disabled={!channel} />
					<button className="border-l-0" disabled={!channel}>
						send
					</button>
				</form>
				<div>Received messages:</div>
				<pre className="text-xs break-all whitespace-pre-wrap">
					{JSON.stringify(channelMessages, null, 2)}
				</pre>
			</div>
			<div>
				<h4>RTCPeerConnection</h4>
				<pre className="text-xs break-all whitespace-pre-wrap">
					{JSON.stringify(state.connection, null, 2)}
				</pre>
			</div>
			<div>
				<h4>RTCIceCandidate</h4>
				<pre className="text-xs break-all whitespace-pre-wrap">
					{JSON.stringify(state.candidates, null, 2)}
				</pre>
			</div>
		</div>
	);
}
