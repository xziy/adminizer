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

    public getLocales(req: ReqType) {
        let obj: Record<string, string> = {
            "Images": "",
            "Videos": "",
            "Texts": "",
            "Applications": "",
            "Table": "",
            "Tile": "",
            "Load more": "",
            "File": "",
            "Name": "",
            "Date": "",
            "Type": "",
            "Size (orig.)": "",
            "W x H (orig.)": "",
            "Sizes/Ver": "",
            "Locales": "",
            "Search": "",
            "Meta data": "",
            "View": "",
            "Crop": "",
            "Variants": "",
            "Delete": "",
            "Click to upload or drag and drop": "",
        }
        let messages = obj
        let outMessages: Record<string, string> = {}
        for (const mess of Object.keys(messages)) {
            outMessages[mess] = req.i18n.__(mess)
        }
        return {
            ...outMessages,
        }
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

    protected setStorage(outputDir: string, isCropped = false) {
        return multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, outputDir);
            },
            filename: (req, file, cb) => {
                const filename = !isCropped ? randomFileName(req.body.name.replace(" ", "_"), "", true) : req.body.name;
                cb(null, filename);
            }
        });
    }

    protected checkDirectory(): string {
        const outputDir = `${this.manager.fileStoragePath}/${this.manager.urlPathPrefix}`;
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, {recursive: true});
        }
        return outputDir
    }

    public async uploadVariant(req: ReqType, res: ResType): Promise<void> {
        const isCropped = req.query.isCropped === "true";

        const config: MediaManagerConfig | null = req.adminizer.config.mediamanager || null;

        const storage = this.setStorage(this.checkDirectory(), isCropped);

        const upload = multer({
            storage: storage,
            limits: {
                fileSize: !isCropped ? config?.maxByteSize ?? 5 * 1024 * 1024 : 5 * 1024 * 1024,
            },
            fileFilter: (req: ReqType, file, cb) => {
                if (!isCropped) {
                    if (this.manager.id === "default" && config?.allowMIME?.length) {
                        const isAllowed = this.checkMIMEType(config.allowMIME, file.mimetype);
                        if (!isAllowed) {
                            req.allowedFileTypes = config.allowMIME;
                            req.uploadedFileType = file.mimetype;
                            return cb(null, false);
                        }
                    }
                }
                cb(null, true);
            }
        }).single("file");

        upload(req, res, async (err) => {
            try {
                if (err) {
                    let errorMessage = err.message;
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        const maxSizeMB = (config?.maxByteSize ?? 2 * 1024 * 1024) / (1024 * 1024);
                        errorMessage = `${req.i18n.__('The file exceeds the size limit')} ${maxSizeMB} MB`;
                    }

                    return res.status(400).json({msg: "error", error: errorMessage});
                }

                if (!req.file && !isCropped) {
                    const allowedTypes = req.allowedFileTypes?.join(', ') || req.i18n.__('acceptable types are not specified');
                    const fileType = req.uploadedFileType || req.i18n.__('unknown type');
                    return res.status(400).json({
                        msg: "error",
                        error: `${req.i18n.__('Files with the type')} ${fileType} ${req.i18n.__('are not supported.')} ` +
                            `${req.i18n.__('Supported types')}: ${allowedTypes}`
                    });
                }

                const item: MediaManagerItem = JSON.parse(req.body.item);
                const group = req.body.group as string;

                const result = await this.manager.uploadVariant(
                    item,
                    req.file,
                    req.file.filename,
                    group,
                    req.body.localeId
                );

                return res.send({
                    msg: "success",
                    data: result,
                });
            } catch (e) {
                console.error(e);
                return res.status(500).send({error: e.message || 'Upload failed'});
            }
        });
    }

    public async upload(req: ReqType, res: ResType) {
        const config = req.adminizer.config.mediamanager || null;

        const storage = this.setStorage(this.checkDirectory());

        const upload = multer({
            storage: storage,
            limits: {
                fileSize: config?.maxByteSize ?? 2 * 1024 * 1024
            },
            fileFilter: (req: ReqType, file, cb) => {
                if (this.manager.id === "default" && config?.allowMIME?.length) {
                    const isAllowed = this.checkMIMEType(config.allowMIME, file.mimetype);
                    if (!isAllowed) {
                        req.allowedFileTypes = config.allowMIME;
                        req.uploadedFileType = file.mimetype;
                        return cb(null, false);
                    }
                }
                cb(null, true);
            }
        }).single("file");

        upload(req, res, async (err) => {
            try {
                if (err) {
                    let errorMessage = err.message;
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        const maxSizeMB = (config?.maxByteSize ?? 2 * 1024 * 1024) / (1024 * 1024);
                        errorMessage = `${req.i18n.__('The file exceeds the size limit')} ${maxSizeMB} MB`;
                    }

                    return res.status(400).json({msg: "error", error: errorMessage});
                }

                if (!req.file) {
                    const allowedTypes = req.allowedFileTypes?.join(', ') || req.i18n.__('acceptable types are not specified');
                    const fileType = req.uploadedFileType || req.i18n.__('unknown type');
                    return res.status(400).json({
                        msg: "error",
                        error: `${req.i18n.__('Files with the type')} ${fileType} ${req.i18n.__('are not supported.')} ` +
                            `${req.i18n.__('Supported types')}: ${allowedTypes}`
                    });
                }

                const origFileName = req.body.name.replace(/\.[^.]+$/, "");
                const item = await this.manager.upload(
                    req.file,
                    req.file.filename,
                    origFileName,
                    req.body.group as string
                );

                return res.json({msg: "success", data: item});
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
     * Check if the file type is allowed.
     * @param allowedTypes - Array of allowed MIME types (e.g., ["image/*", "video/mp4"])
     * @param type - MIME type of the uploaded file (e.g., "image/jpeg")
     * @returns `true` if allowed, `false` if not allowed
     */
    public checkMIMEType(allowedTypes: string[], type: string): boolean {
        const [category] = type.split("/"); // "image/jpeg" → "image"
        const wildcardType = `${category}/*`; // "image/*"

        // Разрешено, если:
        // 1. Точное совпадение (например, "image/jpeg" в allowedTypes)
        // 2. Разрешена вся категория (например, "image/*" в allowedTypes)
        return allowedTypes.includes(type) || allowedTypes.includes(wildcardType);
    }
}
