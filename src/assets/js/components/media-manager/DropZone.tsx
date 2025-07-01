import {useState, useRef, useEffect, FC} from 'react';
import {MediaManagerItem} from "@/types";

interface FileUploadProps {
    uploadUrl: string;
    group: string;
    pushData: (data: MediaManagerItem[]) => void;
}

const DropZone = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [alert, setAlert] = useState<string>('1231232312');
    return (
        <div>
            {alert &&
                <div className="alert bg-red-600 rounded font-medium mt-8 mb-4">
                    <div className="alert-items">
                        <div className="alert-item flex gap-2 p-2 text-white justify-between">
                            <div className="flex gap-2">
                                <div className="alert-icon-wrapper">
                                    <i className="las la-exclamation-triangle text-sm"></i>
                                </div>
                                <span className="alert-text">{alert}</span>
                            </div>
                            <div className="cursor-pointer">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        fill="currentColor"
                                        d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"
                                    ></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            }
        </div>
    )
}
export default DropZone