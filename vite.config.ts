import react from "@vitejs/plugin-react";
import { presetUno } from "unocss";
import unocss from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	clearScreen: false,
	environments: {
		client: {
			build: {
				outDir: "dist/client",
			},
		},
		ssr: {
			build: {
				outDir: "dist/server",
				rollupOptions: {
					input: "./src/entry-server",
				},
			},
		},
	},
	plugins: [
		unocss({ presets: [presetUno()] }),
		react(),
		{
			name: "ssr-middlware",
			configureServer(server) {
				server.middlewares.use(async (req, res, next) => {
					try {
						const mod = await server.ssrLoadModule("/src/entry-server");
						await mod.default(req, res, next);
					} catch (e) {
						next(e);
					}
				});
			},
		},
	],
});
