import {useRef, useState} from "react";
import Cropper from "react-cropper";
import type { ReactCropperElement, ReactCropperProps } from 'react-cropper';

interface ImageCropperProps {
    item: {
        url: string;
        mimeType: string;
        filename: string;
    };
    callback: () => void;
    uploadUrl: string;
    addVariant: (original: any, variant: any) => void;
    group: string;
}

const ImageCropper = ({
                          item,
                          callback,
                          uploadUrl,
                          addVariant,
                          group,
                      }: ImageCropperProps) => {
    const cropperRef = useRef<ReactCropperElement>(null);
    const previewRef = useRef<HTMLImageElement>(null);
    const [previewShow, setPreviewShow] = useState(false);
    const [convertWebp, setConvertWebp] = useState(false);
    const [convertJpeg, setConvertJpeg] = useState(false);
    const [coordinates, setCoordinates] = useState({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
    });

    // Аналогичные настройки Cropper.js
    const cropperOptions: ReactCropperProps = {
        viewMode: 2,
        responsive: true,
        restore: true,
        checkCrossOrigin: true,
        checkOrientation: true,
        modal: true,
        guides: true,
        center: true,
        highlight: true,
        background: true,
        autoCrop: true,
        movable: true,
        rotatable: true,
        scalable: true,
        zoomable: true,
        zoomOnTouch: true,
        zoomOnWheel: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: true,
    };

    const onCrop = () => {
        if (cropperRef.current?.cropper) {
            const data = cropperRef.current.cropper.getData();
            setCoordinates({
                x: Math.round(data.x),
                y: Math.round(data.y),
                width: Math.round(data.width),
                height: Math.round(data.height),
            });
        }
    };

    const setManualCoordinates = () => {
        if (cropperRef.current) {
            cropperRef.current.cropper.setData(coordinates);
        }
    };

    const preview = () => {
        if (cropperRef.current && previewRef.current) {
            const canvas = cropperRef.current.cropper.getCroppedCanvas();
            previewRef.current.src = canvas.toDataURL(item.mimeType, 1);
            setPreviewShow(true);
        }
    };

    const save = async () => {
        if (!cropperRef.current) return;

        const mimeType = convertWebp
            ? "image/webp"
            : convertJpeg
                ? "image/jpeg"
                : item.mimeType;

        cropperRef.current.cropper.getCroppedCanvas().toBlob(
            async (blob) => {
                if (!blob) return;

                const parts = mimeType.split("/");
                const config = {
                    width: coordinates.width,
                    height: coordinates.height,
                };
                const name = `${item.filename}_${config.width}x${config.height}.${parts[1]}`;

                const form = new FormData();
                form.append("name", name);
                form.append("group", group);
                form.append("isCropped", "true");
                form.append("item", JSON.stringify(item));
                form.append("_method", "variant");
                form.append("file", blob);

                try {
                    const response = await fetch(uploadUrl, {
                        method: "POST",
                        body: form,
                    });
                    const data = await response.json();

                    if (data.msg === "success") {
                        addVariant(item, data.data);
                        callback();
                    }
                } catch (error) {
                    console.error("Upload error:", error);
                }
            },
            mimeType,
            0.9
        );
    };

    // Управление кнопками перемещения/масштабирования
    const move = (dx: number, dy: number) => {
        cropperRef.current?.cropper.move(dx, dy);
    };

    const flip = (axis: "x" | "y") => {
        if (axis === "x") cropperRef.current?.cropper.scaleX(-1);
        else cropperRef.current?.cropper.scaleY(-1);
    };

    return (
        <div>
            <Cropper
                src={`/public${item.url}`}
                style={{ height: 540, width: "100%" }}
                initialAspectRatio={1}
                ref={cropperRef}
                {...cropperOptions}
                crop={onCrop}
            />
            {/* Координаты */}
            <div className="grid grid-cols-4 gap-2 mt-4">
                {Object.entries(coordinates).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-2">
                        <label className="admin-panel__title capitalize">{key}</label>
                        <input
                            className="text-input w-full h-[20px]"
                            type="number"
                            value={value}
                            onChange={(e) => {
                                const newValue = parseInt(e.target.value) || 0;
                                setCoordinates((prev) => ({
                                    ...prev,
                                    [key]: newValue,
                                }));
                            }}
                            onBlur={setManualCoordinates}
                        />
                    </div>
                ))}
            </div>

            {/* Кнопки управления */}
            <div className="grid grid-cols-4 gap-2 mt-4">
                <button
                    type="button"
                    className="flex justify-center items-center text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 rounded text-sm px-5 py-2.5"
                    onClick={() => move(0, -20)}
                >
                    ↑
                </button>
                <button
                    type="button"
                    className="flex justify-center items-center text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 rounded text-sm px-5 py-2.5"
                    onClick={() => move(0, 20)}
                >
                    ↓
                </button>
                <button
                    type="button"
                    className="flex justify-center items-center text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 rounded text-sm px-5 py-2.5"
                    onClick={() => move(-20, 0)}
                >
                    ←
                </button>
                <button
                    type="button"
                    className="flex justify-center items-center text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 rounded text-sm px-5 py-2.5"
                    onClick={() => move(20, 0)}
                >
                    →
                </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4">
                <button
                    type="button"
                    className="text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 rounded text-sm px-5 py-2.5"
                    onClick={() => flip("x")}
                >
                    Flip X
                </button>
                <button
                    type="button"
                    className="text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 rounded text-sm px-5 py-2.5"
                    onClick={() => flip("y")}
                >
                    Flip Y
                </button>
                <button
                    className="btn btn-back btn-text"
                    onClick={preview}
                >
                    Preview
                </button>
                <button
                    className="btn btn-green btn-text"
                    onClick={save}
                >
                    Save
                </button>
            </div>

            {/* Форматы */}
            <div className="grid grid-cols-4 gap-2 mt-4">
                <label className="checkbox flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={convertWebp}
                        onChange={() => {
                            setConvertWebp(!convertWebp);
                            if (convertWebp) setConvertJpeg(false);
                        }}
                    />
                    Convert WebP
                </label>
                <label className="checkbox flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={convertJpeg}
                        onChange={() => {
                            setConvertJpeg(!convertJpeg);
                            if (convertJpeg) setConvertWebp(false);
                        }}
                    />
                    Convert Jpeg
                </label>
            </div>

            {/* Превью */}
            {previewShow && (
                <div className="fixed inset-0 bg-black/90 z-[10000] flex items-center justify-center">
                    <button
                        className="absolute top-4 right-4 text-white text-2xl"
                        onClick={() => setPreviewShow(false)}
                    >
                        ×
                    </button>
                    <img ref={previewRef} alt="Preview"/>
                </div>
            )}
        </div>
    );
};

export default ImageCropper;