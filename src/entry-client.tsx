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
