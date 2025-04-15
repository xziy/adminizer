import React, { useState, useEffect, useCallback } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polygon,
    useMap,
    Polyline,
    Rectangle,
} from "react-leaflet";
import L from "leaflet";
import {Button} from "@/components/ui/button.tsx";
import {Hexagon, MapPin, RectangleHorizontal, Trash2} from "lucide-react";


// Фикс для иконок маркеров
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

type Position = [number, number];
type PolygonCoords = Position[];

interface MapFeature {
    id: string | number;
    position?: Position;
    polygon?: PolygonCoords[];
    rectangle?: [Position, Position]; // две точки для прямоугольника
    popupContent?: string;
    color?: string;
}

interface GeoJsonEditorProps {
    mode?: "marker" | "polygon" | "rectangle" | "all";
    initialFeatures?: MapFeature[];
    center?: Position;
    zoom?: number;
    showControls?: boolean;
    controlsPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    onFeaturesChange?: (features: MapFeature[]) => void;
    className?: string;
    style?: React.CSSProperties;
}

const ControlPanel = ({
                          position,
                          onAddMarker,
                          onAddPolygon,
                          onAddRectangle,
                          onClearAll,
                          drawingMode,
                      }: {
    position: string;
    onAddMarker: () => void;
    onAddPolygon: () => void;
    onAddRectangle: () => void;
    onClearAll: () => void;
    drawingMode: string;
}) => {
    const positionClass = {
        "top-left": "leaflet-top leaflet-left",
        "top-right": "leaflet-top leaflet-right",
        "bottom-left": "leaflet-bottom leaflet-left",
        "bottom-right": "leaflet-bottom leaflet-right",
    }[position];

    return (
        <div className={`${positionClass} leaflet-control-container`}>
            <div className="leaflet-control leaflet-bar flex flex-col bg-sidebar [&>button]:border-b">
                <Button
                    className={`cursor-pointer rounded-none leaflet-control-button ${
                        drawingMode === "marker" ? "active" : ""
                    }`}
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        onAddMarker()
                    }}
                    title="Add marker"
                >
                    <MapPin />
                </Button>
                <Button
                    className={`cursor-pointer rounded-none leaflet-control-button ${
                        drawingMode === "polygon" ? "active" : ""
                    }`}
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        onAddPolygon()
                    }}
                    title="Add polygon"
                >
                    <Hexagon />
                </Button>
                <Button
                    className={`cursor-pointer rounded-none leaflet-control-button ${
                        drawingMode === "rectangle" ? "active" : ""
                    }`}
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        onAddRectangle()
                    }}
                    title="Add rectangle"
                >
                    <RectangleHorizontal />
                </Button>
                <Button
                    className="cursor-pointer rounded-none leaflet-control-button"
                    onClick={(e) => {
                        e.preventDefault();
                        onClearAll()
                    }}
                    variant="ghost"
                    size="sm"
                    title="Clear map"
                >
                    <Trash2 />
                </Button>
            </div>
        </div>
    );
};

const MapEditor = ({
                       features,
                       mode,
                       drawingMode,
                       setDrawingMode,
                       onFeaturesChange,
                   }: {
    features: MapFeature[];
    mode: string;
    drawingMode: string;
    setDrawingMode: (mode: string) => void;
    onFeaturesChange: (features: MapFeature[]) => void;
}) => {
    const map = useMap();
    const [currentPolygon, setCurrentPolygon] = useState<Position[]>([]);
    const [rectangleStart, setRectangleStart] = useState<Position | null>(null);
    const [rectangleEnd, setRectangleEnd] = useState<Position | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Добавление маркера
    const addMarker = useCallback(
        (latlng: L.LatLng) => {
            if (drawingMode !== "marker") return;

            const newFeature: MapFeature = {
                id: Date.now(),
                position: [latlng.lat, latlng.lng],
                popupContent: `Маркер ${features.length + 1}`,
            };
            onFeaturesChange([...features, newFeature]);
        },
        [features, onFeaturesChange, drawingMode]
    );

    // Добавление точки полигона
    const addPolygonPoint = useCallback(
        (latlng: L.LatLng) => {
            if (drawingMode !== "polygon") return;

            const newPoint: Position = [latlng.lat, latlng.lng];
            const updatedPoints = [...currentPolygon, newPoint];
            setCurrentPolygon(updatedPoints);

            map.doubleClickZoom.disable();
        },
        [currentPolygon, drawingMode, map]
    );

    // Завершение рисования полигона
    const finishPolygon = useCallback(() => {
        if (currentPolygon.length < 3) {
            setCurrentPolygon([]);
            setIsDrawing(false);
            setDrawingMode("none");
            return;
        }

        const newFeature: MapFeature = {
            id: Date.now(),
            polygon: [[...currentPolygon, currentPolygon[0]]], // Замыкаем полигон
            popupContent: `Полигон ${features.length + 1}`,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        };

        onFeaturesChange([...features, newFeature]);
        setCurrentPolygon([]);
        setIsDrawing(false);
        setDrawingMode("none");
        map.doubleClickZoom.enable();
    }, [currentPolygon, features, onFeaturesChange, setDrawingMode, map]);

    // Начало рисования прямоугольника
    const startRectangle = useCallback(
        (latlng: L.LatLng) => {
            if (drawingMode !== "rectangle") return;

            const pos: Position = [latlng.lat, latlng.lng];
            setRectangleStart(pos);
            setRectangleEnd(pos);
            setIsDrawing(true);
        },
        [drawingMode]
    );

    // Обновление прямоугольника
    const updateRectangle = useCallback(
        (latlng: L.LatLng) => {
            if (!rectangleStart || drawingMode !== "rectangle") return;

            const pos: Position = [latlng.lat, latlng.lng];
            setRectangleEnd(pos);
        },
        [rectangleStart, drawingMode]
    );

    // Завершение рисования прямоугольника
    const finishRectangle = useCallback(() => {
        if (!rectangleStart || !rectangleEnd) {
            setRectangleStart(null);
            setRectangleEnd(null);
            setIsDrawing(false);
            setDrawingMode("none");
            return;
        }

        const newFeature: MapFeature = {
            id: Date.now(),
            rectangle: [rectangleStart, rectangleEnd],
            popupContent: `Прямоугольник ${features.length + 1}`,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        };

        onFeaturesChange([...features, newFeature]);
        setRectangleStart(null);
        setRectangleEnd(null);
        setIsDrawing(false);
        setDrawingMode("none");
    }, [
        rectangleStart,
        rectangleEnd,
        features,
        onFeaturesChange,
        setDrawingMode,
    ]);

    // Обработчики событий карты
    useEffect(() => {
        const handleClick = (e: L.LeafletMouseEvent) => {
            if (drawingMode === "marker") {
                addMarker(e.latlng);
            } else if (drawingMode === "polygon") {
                addPolygonPoint(e.latlng);
            } else if (drawingMode === "rectangle") {
                if (!rectangleStart) {
                    startRectangle(e.latlng);
                } else {
                    finishRectangle();
                }
            }
        };

        const handleMove = (e: L.LeafletMouseEvent) => {
            if (drawingMode === "rectangle" && rectangleStart) {
                updateRectangle(e.latlng);
            }
        };

        const handleDoubleClick = () => {
            if (drawingMode === "polygon") {
                finishPolygon();
            }
        };

        map.on("click", handleClick);
        map.on("mousemove", handleMove);
        map.on("dblclick", handleDoubleClick);

        return () => {
            map.off("click", handleClick);
            map.off("mousemove", handleMove);
            map.off("dblclick", handleDoubleClick);
        };
    }, [
        map,
        drawingMode,
        addMarker,
        addPolygonPoint,
        finishPolygon,
        startRectangle,
        updateRectangle,
        finishRectangle,
        rectangleStart,
    ]);

    // Удаление элемента
    const deleteFeature = useCallback(
        (id: string | number) => {
            onFeaturesChange(features.filter((f) => f.id !== id));
        },
        [features, onFeaturesChange]
    );

    // Клавиша Escape для отмены рисования
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isDrawing) {
                setCurrentPolygon([]);
                setRectangleStart(null);
                setRectangleEnd(null);
                setIsDrawing(false);
                setDrawingMode("none");
                map.doubleClickZoom.enable();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isDrawing, setDrawingMode, map]);

    return (
        <>
            {features.map((feature) => (
                <React.Fragment key={feature.id}>
                    {(mode === "marker" || mode === "all") && feature.position && (
                        <Marker position={feature.position}>
                            <Popup>
                                {feature.popupContent}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteFeature(feature.id);
                                    }}
                                    style={{ marginTop: "10px" }}
                                >
                                    Удалить
                                </button>
                            </Popup>
                        </Marker>
                    )}

                    {(mode === "polygon" || mode === "all") && feature.polygon && (
                        <Polygon
                            positions={feature.polygon}
                            pathOptions={{ color: feature.color || "blue" }}
                        >
                            <Popup>
                                {feature.popupContent}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteFeature(feature.id);
                                    }}
                                    style={{ marginTop: "10px" }}
                                >
                                    Удалить
                                </button>
                            </Popup>
                        </Polygon>
                    )}

                    {(mode === "rectangle" || mode === "all") && feature.rectangle && (
                        <Rectangle
                            bounds={feature.rectangle}
                            pathOptions={{ color: feature.color || "green" }}
                        >
                            <Popup>
                                {feature.popupContent}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteFeature(feature.id);
                                    }}
                                    style={{ marginTop: "10px" }}
                                >
                                    Удалить
                                </button>
                            </Popup>
                        </Rectangle>
                    )}
                </React.Fragment>
            ))}

            {/* Текущий рисуемый полигон */}
            {drawingMode === "polygon" && currentPolygon.length > 0 && (
                <>
                    <Polyline
                        positions={currentPolygon}
                        color="red"
                        weight={3}
                        dashArray="5, 5"
                    />
                    {currentPolygon.length > 0 && (
                        <Polyline
                            positions={[
                                currentPolygon[currentPolygon.length - 1],
                                currentPolygon[0],
                            ]}
                            color="red"
                            weight={3}
                            dashArray="5, 5"
                        />
                    )}
                </>
            )}

            {/* Текущий рисуемый прямоугольник */}
            {drawingMode === "rectangle" && rectangleStart && rectangleEnd && (
                <Rectangle
                    bounds={[rectangleStart, rectangleEnd]}
                    pathOptions={{ color: "red", fillOpacity: 0.3, weight: 3 }}
                />
            )}
        </>
    );
};

const GeoJsonEditor: React.FC<GeoJsonEditorProps> = ({
                                                       mode = "all",
                                                       initialFeatures = [],
                                                       center = [45.7, 60.1],
                                                       zoom = 3,
                                                       showControls = true,
                                                       controlsPosition = "top-right",
                                                       onFeaturesChange,
                                                       className,
                                                       style,
                                                   }) => {
    const [features, setFeatures] = useState<MapFeature[]>(initialFeatures);
    const [drawingMode, setDrawingMode] = useState<
        "none" | "marker" | "polygon" | "rectangle"
    >("none");

    // Объединенный обработчик изменений
    const handleFeaturesChange = useCallback(
        (newFeatures: MapFeature[]) => {
            setFeatures(newFeatures);
            if (onFeaturesChange) {
                onFeaturesChange(newFeatures);
            }
        },
        [onFeaturesChange]
    );

    // Переключение режимов рисования
    const toggleDrawingMode = useCallback((mode: "marker" | "polygon" | "rectangle" | "none") => {
        setDrawingMode((prev) => (prev === mode ? "none" : mode));
    }, []);

    // Очистка карты
    const handleClearAll = useCallback(() => {
        handleFeaturesChange([]);
        setDrawingMode("none");
    }, [handleFeaturesChange]);

    return (
        <div className={className} style={{ position: "relative", ...style }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: "400px", width: "100%" }}
                doubleClickZoom={true}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <MapEditor
                    features={features}
                    mode={mode}
                    drawingMode={drawingMode}
                    //@ts-ignore
                    setDrawingMode={setDrawingMode}
                    onFeaturesChange={handleFeaturesChange}
                />

                {showControls && (
                    <ControlPanel
                        position={controlsPosition}
                        onAddMarker={() => toggleDrawingMode("marker")}
                        onAddPolygon={() => toggleDrawingMode("polygon")}
                        onAddRectangle={() => toggleDrawingMode("rectangle")}
                        onClearAll={handleClearAll}
                        drawingMode={drawingMode}
                    />
                )}
            </MapContainer>

            {drawingMode === "polygon" && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "white",
                        padding: "10px",
                        borderRadius: "5px",
                        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
                        zIndex: 1000,
                    }}
                >
                    Рисование полигона: кликните чтобы добавить точки, двойной клик чтобы
                    завершить
                </div>
            )}

            {drawingMode === "rectangle" && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "white",
                        padding: "10px",
                        borderRadius: "5px",
                        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
                        zIndex: 1000,
                    }}
                >
                    Рисование прямоугольника: кликните и перетащите чтобы создать
                    прямоугольник
                </div>
            )}
        </div>
    );
};

export default GeoJsonEditor;
