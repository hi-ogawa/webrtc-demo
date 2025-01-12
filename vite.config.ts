import react from "@vitejs/plugin-react";
import { presetUno } from "unocss";
import unocss from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	clearScreen: false,
	environments: {
		client: {
			build: {
				outDir: "dist",
			},
		},
	},
	plugins: [unocss({ presets: [presetUno()] }), react()],
});
