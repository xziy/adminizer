import {InstallStepper} from "../lib/installStepper/installStepper";
import * as path from "path";
import {Adminizer} from "../lib/Adminizer";

export default async function processInstallStep(req: ReqType, res: ResType): Promise<void> {
	if (req.adminizer.config.auth.enable) {
		if (!req.session.UserAP) {
			res.redirect(`${req.adminizer.config.routePrefix}/model/userap/login`);
			return
		} else if (!req.adminizer.accessRightsHelper.hasPermission(`process-install-step`, req.session.UserAP)) {
			res.sendStatus(403);
			return
		}
	}

	if (req.method.toUpperCase() === 'GET') {
		Adminizer.log.debug("GET REQUEST TO PROCESS INSTALL STEP")
		let installStepper = InstallStepper.getStepper(req.params.id);
		if (!installStepper) {
			res.redirect(`${req.adminizer.config.routePrefix}/`);
			return
		}

		if (installStepper.hasUnprocessedSteps() || installStepper.hasUnfinalizedSteps()) {
			let renderData = installStepper.render(req);
			let renderer = renderData.currentStep.renderer;
			// run onInit method before showing step to user
			try {
				await renderData.currentStep.onInit();
			} catch (e) {
				console.log("ERROR IN PROCESS INSTALL STEP", e)
				res.viewAdmin(`installer/error`, {error: e, stepperId: installStepper.id});
				return
			}

			res.viewAdmin(`installer/${renderer}`, {...renderData, stepperId: installStepper.id});
			return
		} else {
			res.redirect(`${req.adminizer.config.routePrefix}/`);
			return
		}
	}

	if (req.method.toUpperCase() === 'POST') {

		try {
			Adminizer.log.debug("POST REQUEST TO PROCESS INSTALL STEP", JSON.stringify(req.body, null, 2))
			let installStepper = InstallStepper.getStepper(req.params.id);

			const currentStepId = req.body.currentStepId;
			const filesCounter = req.body.filesCounter;

			// upload files before processing other fields (filesCounter > 0 means that req contains files)
			const uploadedFiles = await handleFileUploads(req, currentStepId, filesCounter);

			if (req.body.action === 'next') {
				const inputData = JSON.parse(req.body.inputData);
				if (uploadedFiles.length) {
					inputData.uploadedFiles = uploadedFiles;
				}

				// trying to process step
				await installStepper.processStep(currentStepId, inputData);

			} else if (req.body.action === 'skip') {
				// trying to skip step
				await installStepper.skipStep(currentStepId);

			} else {
				res.status(400).send("Invalid action parameter");
				return
			}

			// go back to stepper if there are more unprocessed steps, otherwise go back to /admin
			if (installStepper.hasUnprocessedSteps()) {
				res.redirect(`${req.adminizer.config.routePrefix}/install/${installStepper.id}`);
				return
			} else {
				res.redirect(`${req.adminizer.config.routePrefix}/`);
				return
			}

		} catch (error) {
			Adminizer.log.error("Error processing step:", error);
			res.status(500).send("Error processing step");
			return
		}
	}

	if (req.method.toUpperCase() === 'DELETE') {
		Adminizer.log.debug("DELETE REQUEST TO PROCESS INSTALL STEP", req.body)

		try {
			InstallStepper.deleteStepper(req.params.id);
			res.status(200).send("OK")
			return
		} catch (e) {
			res.status(403).send(e);
			return
		}
	}

	res.status(500).send("Invalid request method")
	return
};


async function handleFileUploads(req: ReqType, currentStepId: string | number, filesCounter: number): Promise<string[]> {
	const uploadedFiles: string[] = [];

	for (let i = 0; i < filesCounter; i++) {
		const fieldName = `files_${i}`;
		const uploadMiddleware = req.upload({
			destination: "installStepper/uploadedImages",
			filename: (file) => {
				const extension = path.extname(file.originalname);
				const baseName = path.basename(file.originalname, extension);
				return `${currentStepId}_${baseName}_${Date.now()}${extension}`;
			},
		}).single(fieldName);

		try {
			await new Promise<void>((resolve, reject) => {
				uploadMiddleware(req, null, (err) => {
					if (err) {
						Adminizer.logger.error(`Error uploading file: ${fieldName}`, err);
						reject(err);

					} else {
						const uploadedFile = (req.file as Express.Multer.File)?.path;
						if (uploadedFile) {
							uploadedFiles.push(uploadedFile);
						}
						resolve();
					}
				});
			});
		} catch (err) {
			Adminizer.logger.error(`Failed to upload file: ${fieldName}`, err);
		}
	}

	return uploadedFiles;
}

