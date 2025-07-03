import {AbstractMediaManager, MediaManagerItem} from "../../lib/media-manager/AbstractMediaManager";
import {randomFileName} from "../../lib/media-manager/helpers/MediaManagerHelper";
import {MediaManagerConfig} from "../../interfaces/adminpanelConfig";
import fs from "fs";
import multer from 'multer';

export class MediaManagerAdapter {
    protected manager: AbstractMediaManager;

    constructor(manager: AbstractMediaManager) {
        this.manager = manager;
    }

    public async delete(req: ReqType, res: ResType) {
        await this.manager.delete(req.body.item);
        return res.send({msg: "ok"});
    }

    public async get(req: ReqType, res: ResType) {
        let type = req.query.type as string;

        interface resultType {
            data: MediaManagerItem[];
            next: boolean;
        }

        let result: resultType;
        if (type === "all") {
            result = (await this.manager.getAll(
                +req.query.count,
                +req.query.skip,
                "createdAt DESC",
                req.query.group as string
            )) as resultType;
        } else {
            result = (await this.manager.getItems(
                type,
                +req.query.count,
                +req.query.skip,
                "createdAt DESC",
                req.query.group as string
            )) as resultType;
        }
        return res.send({
            data: result.data,
            next: !!result.next,
        });
    }

    public async search(req: ReqType, res: ResType) {
        let s = req.body.s as string;
        let type = req.body.type as string;
        let data: MediaManagerItem[];
        if (type === "all") {
            data = await this.manager.searchAll(s);
        } else {
            data = await this.manager.searchItems(s, type);
        }
        return res.send({data: data});
    }

    public async getVariants(req: ReqType, res: ResType) {
        return res.send({
            data: await this.manager.getVariants(req.body.item),
        });
    }

    // public async uploadVariant(req: ReqType, res: ResType): Promise<void> {
    //     const item: MediaManagerItem = JSON.parse(req.body.item);
    //     let filename = randomFileName(req.body.name, "", true);
    //     const group = req.body.group as string;
    //     const isCropped = req.body.isCropped;
    //
    //     if (!isCropped) {
    //         const config: MediaManagerConfig | null = req.adminizer.config.mediamanager || null;
    //
    //         const uploadFile = req.file;
    //         const byteCount = uploadFile.size;
    //         const settings = {
    //             allowedTypes: config?.allowMIME ?? [],
    //             maxBytes: config?.maxByteSize ?? 2 * 1024 * 1024, // 2 MB
    //         };
    //
    //         // Check file type
    //         if (settings.allowedTypes.length && !settings.allowedTypes.includes(uploadFile.mimetype)) {
    //             res.status(400).send({msg: `Wrong filetype (${uploadFile.mimetype}).`});
    //             return
    //         }
    //
    //         // Check file size
    //         if (byteCount > settings.maxBytes) {
    //             res.status(400).send({msg: `File size exceeds the limit of ${settings.maxBytes / 1024 / 1024} MB.`});
    //             return
    //         }
    //     }
    //
    //     // Proceed with file upload after validation
    //     req.upload({
    //         destination: this.manager.dir,
    //         filename: () => filename,
    //     }).single("file")(req, res, async (err) => {
    //         if (err) {
    //             return res.status(500).send({error: err.message || 'Internal Server Error'});
    //         }
    //
    //         try {
    //             const result = await this.manager.uploadVariant(
    //                 item,
    //                 req.file,
    //                 filename,
    //                 group,
    //                 req.body.localeId
    //             );
    //
    //             return res.send({
    //                 msg: "success",
    //                 data: result,
    //             });
    //         } catch (e) {
    //             console.error(e);
    //             return res.status(500).send({error: e.message || 'Internal Server Error'});
    //         }
    //     });
    // }

    public async upload(req: ReqType, res: ResType) {
        const config = req.adminizer.config.mediamanager || null;
        const group = req.body.group as string;

        const outputDir = `${this.manager.fileStoragePath}/${this.manager.urlPathPrefix}`;

        // Проверяем и создаем директорию, если ее нет
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Создаем storage для Multer
        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, outputDir);
            },
            filename: (req, file, cb) => {
                const filename = randomFileName(req.body.name.replace(" ", "_"), "", true);
                cb(null, filename);
            }
        });

        const upload = multer({
            storage: storage,
            limits: {
                fileSize: config?.maxByteSize ?? 2 * 1024 * 1024
            },
            fileFilter: (req, file, cb) => {
                if (this.manager.id === "default" && config?.allowMIME?.length) {
                    const isAllowed = !this.checkMIMEType(config.allowMIME, file.mimetype);
                    if (!isAllowed) {
                        return cb(new Error(`Wrong filetype (${file.mimetype}).`));
                    }
                }
                cb(null, true);
            }
        }).single("file");

        // Выполняем загрузку
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).send({ error: err.message });
            }

            if (!req.file) {
                return res.status(400).send({ error: 'No file uploaded' });
            }

            try {
                const origFileName = req.body.name.replace(/\.[^.]+$/, "");
                const item = await this.manager.upload(
                    req.file,
                    req.file.filename, // используем имя файла, которое сгенерировал Multer
                    origFileName,
                    group
                );

                return res.send({ msg: "success", data: item });
            } catch (e) {
                console.error(e);
                return res.status(500).send({error: e.message || 'Upload failed'});
            }
        });
    }

    public async getMeta(req: ReqType, res: ResType) {
        return res.send({data: await this.manager.getMeta(req.body.item)});
    }

    public async setMeta(req: ReqType, res: ResType): Promise<void> {
        try {
            await this.manager.setMeta(req.body.item, req.body.data)
            res.send({massage: 'ok'});
            return
        } catch (e) {
            console.error(e)
        }
    }

    /**
     * Check file type. Return false if the type is allowed.
     * @param allowedTypes
     * @param type
     */
    public checkMIMEType(allowedTypes: string[], type: string) {
        const partsFileType = type.split("/");
        const allowedType = `${partsFileType[0]}/*`;
        if (allowedTypes.includes(allowedType)) return false;
        return !allowedTypes.includes(type);
    }
}
