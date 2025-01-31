import { watch } from "chokidar";
import { copyFiles } from "../lib/copyFiles.ts";
import { generateVersionNumber } from "../lib/generateVersionNumber.ts";
import { reset } from "../lib/reset.ts";
import { setTimestamps } from "../lib/setTimestamps.ts";

// Would be better to only copy individual files on update, but this is fast enough

const watchFiles = async (
	updateStart: (filename: string) => void,
	updateEnd: (filename: string) => void,
	updateError: (filename: string, error: Error) => void,
) => {
	const outFilename = "static files";

	const buildWatchFiles = async () => {
		try {
			updateStart(outFilename);

			await copyFiles(true);

			const versionNumber = generateVersionNumber();
			setTimestamps(versionNumber, true);
			//minifyIndexHTML();

			updateEnd(outFilename);
		} catch (error) {
			updateError(outFilename, error);
		}
	};

	await reset();
	await buildWatchFiles();

	const watcher = watch(["public", "data", "node_modules/flag-icons"], {});
	watcher.on("change", buildWatchFiles);
};

export default watchFiles;
