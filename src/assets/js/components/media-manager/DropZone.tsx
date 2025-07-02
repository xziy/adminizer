import React, {useState, useRef, useEffect, FC, useContext} from 'react';
import {MediaManagerItem} from "@/types";
import {TriangleAlert, XIcon} from "lucide-react";
import styles from '@/components/media-manager/DropZone.module.css'
import axios from "axios";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";

interface FileUploadProps {
    pushData: (data: MediaManagerItem[]) => void;
}

const DropZone: FC<FileUploadProps> = ({pushData}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [alert, setAlert] = useState<string>('');

    const { uploadUrl, group } = useContext(MediaManagerContext);

    const handleClose = () => {
        setAlert('')
    }

    const preventDefaults = (e: Event) => {
        e.preventDefault();
    };

    const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setLoading(true);

        if (e.dataTransfer.files) {
            for (const file of e.dataTransfer.files) {
                await upload(file);
            }
        }
    };

    const onLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            for (const file of e.target.files) {
                setLoading(true);
                await upload(file);
            }
        }
    };

    const upload = async (file: File) => {
        console.log(uploadUrl)
        try {
            const form = new FormData();
            form.append("name", file.name);
            form.append("_method", "upload");
            form.append("group", group);
            form.append("file", file);
            // const res = await ky.post(uploadUrl, { body: form }).json<{
            //     msg: string;
            //     data: any;
            // }>();
            const res = await axios.post(uploadUrl, form)

            // if (res.msg === "success") {
            //     setLoading(false);
            //     pushData(res.data);
            // } else {
            //     setLoading(false);
            //     setAlert(res.msg);
            // }
        } catch (error) {
            // setLoading(false);
            // setAlert("Произошла ошибка при загрузке файла");
            // console.error(error);
        }
    };

    useEffect(() => {
        const events: Array<keyof DocumentEventMap> = [
            "dragenter",
            "dragover",
            "dragleave",
            "drop"
        ];

        events.forEach((eventName) => {
            document.body.addEventListener(eventName, preventDefaults);
        });

        return () => {
            events.forEach((eventName) => {
                document.body.removeEventListener(eventName, preventDefaults);
            });
        };
    }, []);

    return (
        <div className="mt-8">
            <div>
                {alert &&
                    <div className="bg-red-600 rounded font-medium mb-4">
                        <div>
                            <div className="flex gap-2 p-2 text-white justify-between">
                                <div className="flex gap-2">
                                    <TriangleAlert/>
                                    <span className="alert-text">{alert}</span>
                                </div>
                                <div onClick={handleClose}
                                     className="cursor-pointer hover:opacity-80 transition-opacity">
                                    <XIcon/>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            </div>
            <div className={`h-[106px] relative transition`}>
                <div
                    onDrop={onDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className={`${styles.DropZone} rounded-md flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors h-full ${loading ? 'opacity-30' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    aria-label="Load files"
                >
                    <span className="text-sm text-[#C6BBBB]">dropzone</span>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onLoad}
                    hidden
                    multiple
                    accept="*"
                />
                {loading && (
                    <span
                        className={`${styles.Loader} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border-3 border-solid border-gray-200 border-t-blue-500 rounded-full animate-spin`}></span>
                )}
            </div>
        </div>
    )
}
export default DropZone