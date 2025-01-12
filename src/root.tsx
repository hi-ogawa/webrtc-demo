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
				connectionState: this.pc.connectionState,
				signalingState: this.pc.signalingState,
				iceConnectionState: this.pc.iceConnectionState,
				iceGatheringState: this.pc.iceGatheringState,
				localDescription: this.pc.localDescription,
				remoteDescription: this.pc.remoteDescription,
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

	function setChannelWrapper(channel: RTCDataChannel) {
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

		setChannel(channel);
	}

	return [
		channel,
		setChannelWrapper,
		{ messages, ready: state === "open" },
	] as const;
}

function App() {
	const state = React.useSyncExternalStore(
		manager.subscribe,
		manager.getSnapshot,
	);

	const [channel, setChannel, channelState] = useDataChannel();

	const videoRef = React.useRef<HTMLVideoElement>(null);
	const [example, setExample] = React.useState<"datachannel" | "track">(
		"datachannel",
	);

	return (
		<div className="flex flex-col gap-4 w-full max-w-lg mx-auto items-start p-2">
			<div className="flex items-center w-full">
				<h1 className="flex-1 text-xl">WebRTC Demo</h1>
				<a href="https://github.com/hi-ogawa/webrtc-demo" target="_blank">
					GitHub
				</a>
			</div>
			<div className="text-sm text-slate-800">
				Open two tabs, one for the "Caller" and one for the "Callee". Follow the
				steps 1-6 below to setup WebRTC and test DataChannel or Video example.
			</div>
			<label>
				<span>Example: </span>
				<select
					onChange={(e) => {
						setExample(e.target.value as any);
					}}
				>
					<option value="datachannel">DataChannel</option>
					<option value="track">Track</option>
				</select>
			</label>
			<div className="flex w-full">
				<div className="flex-1 flex flex-col gap-2 items-center">
					<h4>Caller</h4>
					{example === "datachannel" && (
						<button
							onClick={async () => {
								const channel = manager.pc.createDataChannel("webrtc-demo");
								setChannel(channel);
							}}
						>
							1. createDataChannel
						</button>
					)}
					{example === "track" && (
						<button
							onClick={async () => {
								const media = await navigator.mediaDevices.getUserMedia({
									video: true,
									audio: false,
								});
								videoRef.current!.srcObject = media;
								manager.pc.addTrack(media.getVideoTracks()[0]);
							}}
						>
							1. getUserMedia + addTrack
						</button>
					)}
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
					{example === "datachannel" && (
						<button
							onClick={() => {
								manager.pc.addEventListener("datachannel", (e) => {
									const channel = e.channel;
									setChannel(channel);
								});
							}}
						>
							3. listen "datachannel" event
						</button>
					)}
					{example === "track" && (
						<button
							onClick={() => {
								manager.pc.addEventListener("track", (e) => {
									videoRef.current!.srcObject = new MediaStream([e.track]);
								});
							}}
						>
							3. listen "track" event
						</button>
					)}
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
			{example === "datachannel" && (
				<div className="flex flex-col gap-1">
					<h4>DataChannel</h4>
					<form
						action={(formData) => {
							if (!channel) return;
							channel.send(String(formData.get("message")));
						}}
					>
						<input
							name="message"
							placeholder="message..."
							disabled={!channelState.ready}
						/>
						<button className="border-l-0" disabled={!channelState.ready}>
							send
						</button>
					</form>
					<div>Received messages:</div>
					<pre className="text-xs break-all whitespace-pre-wrap">
						{JSON.stringify(channelState.messages, null, 2)}
					</pre>
				</div>
			)}
			{example === "track" && (
				<div className="flex flex-col gap-1 w-full">
					<h4>Video</h4>
					<div className="w-full max-w-sm mx-auto">
						<div className="relative w-full aspect-square overflow-hidden bg-black/95">
							<video
								className="absolute w-full h-full"
								ref={videoRef}
								autoPlay
								playsInline
							></video>
						</div>
					</div>
				</div>
			)}
			<div>
				<div className="flex gap-2">
					<h4>RTCPeerConnection</h4>
					<button
						className="p-0 px-1 text-xs"
						onClick={() => {
							navigator.clipboard.writeText(
								JSON.stringify(state.connection.localDescription),
							);
						}}
					>
						copy localDescription
					</button>
				</div>
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
