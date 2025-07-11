import React, {useState, useRef, useEffect, FC, useContext} from 'react';
import {TriangleAlert, XIcon} from "lucide-react";
import styles from '@/components/media-manager/DropZone.module.css'
import axios from "axios";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import {GalleryRef} from "@/components/media-manager/Gallery.tsx";

interface DropZoneProps {
    galleryRef: React.RefObject<GalleryRef>;
}

const DropZone: FC<DropZoneProps> = ({galleryRef }) => {
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
        try {
            const form = new FormData();
            form.append("name", file.name);
            form.append("group", group);
            form.append("file", file);

            const res = await axios.post(`${uploadUrl}/upload`, form, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.msg === "success") {
                setLoading(false);
                galleryRef.current?.pushMediaItem(res.data.data[0]);
                // console.log(res.data.data[0]);
                return; // Успешная загрузка
            }

            // Обработка ошибки от сервера (например, когда msg === "error")
            setLoading(false);
            setAlert(res.data.error || "Upload failed");

        } catch (error) {
            setLoading(false);

            if (axios.isAxiosError(error)) {
                // Обработка ошибок Axios (включая 400 и другие HTTP ошибки)
                if (error.response) {
                    // Сервер ответил с кодом ошибки (4xx, 5xx)
                    const errorMessage = error.response.data?.error ||
                        error.response.data?.message ||
                        error.response.statusText;
                    setAlert(errorMessage || `Error: ${error.response.status}`);
                } else if (error.request) {
                    // Запрос был сделан, но ответ не получен
                    setAlert("No response from server");
                } else {
                    // Ошибка при настройке запроса
                    setAlert("Request setup error");
                }
            } else {
                // Не Axios ошибка
                setAlert("Error uploading file");
                console.error(error);
            }
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