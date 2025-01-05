import "virtual:uno.css";
import React from "react";
import ReactDOMClient from "react-dom/client";
import { Root } from "./ui/root";
import { toast } from "./ui/toast";

function main() {
	const domRoot = document.getElementById("root")!;
	const reactRoot = ReactDOMClient.createRoot(domRoot);
	const root = (
		<React.StrictMode>
			<Root />
		</React.StrictMode>
	);
	toast.render();
	reactRoot.render(root);
}

main();

// serverless webrtc chat?
// data channel

// const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function mainWebRtc() {
	// https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation

	const pc = new RTCPeerConnection({
		// https://www.metered.ca/blog/list-of-webrtc-ice-servers/
		iceServers: [
			{ urls: "stun:stun.l.google.com:19302" },
			// { urls: "stun:stun.l.google.com:5349" },
			// { urls: "stun:stun1.l.google.com:3478" },
			// { urls: "stun:stun1.l.google.com:5349" },
			// { urls: "stun:stun2.l.google.com:19302" },
			// { urls: "stun:stun2.l.google.com:5349" },
			// { urls: "stun:stun3.l.google.com:3478" },
			// { urls: "stun:stun3.l.google.com:5349" },
			// { urls: "stun:stun4.l.google.com:19302" },
			// { urls: "stun:stun4.l.google.com:5349" }
		],
	});
	Object.assign(globalThis, { pc });
	pc.onsignalingstatechange = (e) => {
		console.log("[onsignalingstatechange]", e);
		document.body.appendChild(
			Object.assign(document.createElement("pre"), {
				textContent: JSON.stringify(
					[
						"onsignalingstatechange",
						{
							connectionState: pc.connectionState,
							iceConnectionState: pc.iceConnectionState,
							signalingState: pc.signalingState,
							localDescription: pc.localDescription,
						},
					],
					null,
					2,
				),
			}),
		);
	};
	pc.onicegatheringstatechange = (e) =>
		console.log("[onicegatheringstatechange]", e);
	pc.onicecandidate = (e) => {
		console.log("[onicecandidate]", e);
		document.body.appendChild(
			Object.assign(document.createElement("pre"), {
				textContent: JSON.stringify(["onicecandidate", e.candidate], null, 2),
			}),
		);
	};
	pc.onicecandidateerror = (e) => console.log("[onicecandidateerror]", e);
	pc.onconnectionstatechange = (e) => {
		console.log("[onconnectionstatechange]", e);
		document.body.appendChild(
			Object.assign(document.createElement("pre"), {
				textContent: JSON.stringify(
					[
						"onconnectionstatechange",
						{
							connectionState: pc.connectionState,
							iceConnectionState: pc.iceConnectionState,
							signalingState: pc.signalingState,
							localDescription: pc.localDescription,
						},
					],
					null,
					2,
				),
			}),
		);
	};
	pc.ondatachannel = (e) => console.log("[ondatachannel]", e);
	pc.onnegotiationneeded = (e) => {
		console.log("[onnegotiationneeded]", e);
		pc.setLocalDescription();
	};

	// const channel = pc.createDataChannel("test");
	const channel = pc.createDataChannel("test", { negotiated: true, id: 0 });
	console.log(channel);
	Object.assign(globalThis, { channel });
	channel.onclose = (e) => console.log("[channel.onclose]", e);
	channel.onerror = (e) => console.log("[channel.onerror]", e);
	channel.onopen = (event) => {
		console.log("[channel.onopen]", event);
		channel.send("Hi you!\n");
	};
	channel.onmessage = (event) => {
		console.log("[channel.onmessage]", event);
	};

	// pc.setLocalDescription();

	// await pc.setLocalDescription();
	// console.log(pc.localDescription);

	// document.body.appendChild(Object.assign(document.createElement("pre"), {
	// 	textContent: JSON.stringify(pc.localDescription, null, 2)
	// }))

	// 1. copy paste from other tabs
	// pc.setRemoteDescription(...);
	// 2. update local description (type: offer -> answer)
	// pc.setLocalDescription();
	// pc.addIceCandidate;

	// const offer = await pc.createOffer()
	// console.log(offer);
	// await pc.setLocalDescription(offer);

	// const channel = pc.createDataChannel("test");
	// console.log(channel);

	// channel.onopen = (event) => {
	// 	console.log("[open]", event)
	// 	channel.send("Hi you!");
	// };
	// channel.onmessage = (event) => {
	// 	console.log("[message]", event)
	// };
	// let localStream;
	// let remoteStream;
	// let peerConnection;

	// const servers = {
	// 		iceServers: [
	// 				{
	// 						urls: 'stun:stun1.l.google.com:19302'
	// 				}
	// 		]
	// }

	// let init = async () => {
	//   localStream = await navigator.mediaDevices.getUserMedia( {video: true} );
	//   (document.getElementById('user-1') as HTMLMediaElement).srcObject = localStream;

	//   createOffer();
	// }

	// // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Session_lifetime

	// let createOffer = async () => {
	// 		peerConnection = new RTCPeerConnection(servers);

	// 		remoteStream = new MediaStream();
	// 		(document.getElementById('user-2') as HTMLMediaElement).srcObject = remoteStream;

	// 		// localStream.getTracks().forEach((track) => {
	// 		// 		// peerConnection.addTrack(track, localStream);
	// 		// });

	// 		// peerConnection.ontrack = (event) => {
	// 		// 		event.streams[0].getTracks().forEach((track) => {
	// 		// 				remoteStream.addTrack();
	// 		// 		});
	// 		// };

	// 		// peerConnection.onicecandidate = async (event) => {
	// 		// 		if (event.candidate) {
	// 		// 				console.log('NEW ice candidate', event.candidate);
	// 		// 		}
	// 		// }

	// 		await peerConnection.setLocalDescription();
	// 		const description = peerConnection.localDescription;
	// 		console.log(description)
	// 		if (description) {
	// 			description.type;
	// 			description.sdp;

	// 		}

	// 		// console.log('Offer:', offer);
	// }

	// init()

	// connection.onicecandidate = (e) => {
	// 	console.log(e);
	// }
}

// mainWebRtc();
