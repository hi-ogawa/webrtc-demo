import "virtual:uno.css";
import React from "react";
import ReactDOMClient from "react-dom/client";
// import { App } from "./app";
// import { QueryClientWrapper } from "./utils/query";
// import { toast } from "./utils/toast";

function App() {
	return <div>hello</div>;
}

function main() {
	const domRoot = document.getElementById("root")!;
	const reactRoot = ReactDOMClient.createRoot(domRoot);
	const root = (
		<React.StrictMode>
			<App />
		</React.StrictMode>
	);
	// toast.render();
	reactRoot.render(root);
}

main();
