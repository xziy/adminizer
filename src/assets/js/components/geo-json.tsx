import React, { useState, useEffect, useCallback } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Polygon,
    useMap,
    Polyline,
    Rectangle,
} from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button.tsx";
import { Hexagon, MapPin, RectangleHorizontal, Trash2, Check } from "lucide-react";

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

const polylineStyle = {
    color: "red",
    weight: 5,
    opacity: 1,
    fillOpacity: 0.7,
    dashArray: "0",
};

type Position = [number, number];
type PolygonCoords = Position[];

interface MapFeature {
    id: string | number;
    position?: Position;
    polygon?: PolygonCoords[];
    rectangle?: [Position, Position];
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
                          onFinishDrawing,
                          drawingMode,
                          drawingInProgress,
                      }: {
    position: string;
    onAddMarker: () => void;
    onAddPolygon: () => void;
    onAddRectangle: () => void;
    onClearAll: () => void;
    onFinishDrawing: () => void;
    drawingMode: string;
    drawingInProgress: boolean;
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
                        e.stopPropagation();
                        onAddMarker();
                    }}
                    title="Add marker"
                    disabled={drawingInProgress}
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
                        e.stopPropagation();
                        onAddPolygon();
                    }}
                    title="Add polygon"
                    disabled={drawingInProgress && drawingMode !== "polygon"}
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
                        e.stopPropagation();
                        onAddRectangle();
                    }}
                    title="Add rectangle"
                    disabled={drawingInProgress}
                >
                    <RectangleHorizontal />
                </Button>
                {drawingMode === "polygon" && drawingInProgress && (
                    <Button
                        className="cursor-pointer rounded-none leaflet-control-button bg-green-500 hover:bg-green-600 text-white"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onFinishDrawing();
                        }}
                        variant="ghost"
                        size="sm"
                        title="Finish drawing"
                    >
                        <Check />
                    </Button>
                )}
                <Button
                    className="cursor-pointer rounded-none leaflet-control-button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClearAll();
                    }}
                    variant="ghost"
                    size="sm"
                    title="Clear map"
                    disabled={drawingInProgress}
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
                       setDrawingInProgress,
                       onFinishDrawing,
                   }: {
    features: MapFeature[];
    mode: string;
    drawingMode: string;
    setDrawingMode: (mode: string) => void;
    onFeaturesChange: (features: MapFeature[]) => void;
    setDrawingInProgress: (value: boolean) => void;
    onFinishDrawing: () => void;
}) => {
    const map = useMap();
    const [currentPolygon, setCurrentPolygon] = useState<Position[]>([]);
    const [rectangleStart, setRectangleStart] = useState<Position | null>(null);
    const [rectangleEnd, setRectangleEnd] = useState<Position | null>(null);

    // Завершение рисования полигона
    const completePolygon = useCallback(() => {
        if (currentPolygon.length < 3) {
            setCurrentPolygon([]);
            setDrawingMode("none");
            setDrawingInProgress(false);
            return;
        }

        const newFeature: MapFeature = {
            id: Date.now(),
            polygon: [[...currentPolygon, currentPolygon[0]]],
            popupContent: `Полигон ${features.length + 1}`,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        };

        onFeaturesChange([...features, newFeature]);
        setCurrentPolygon([]);
        setDrawingMode("none");
        setDrawingInProgress(false);
        map.doubleClickZoom.enable();
    }, [
        currentPolygon,
        features,
        onFeaturesChange,
        setDrawingMode,
        map,
        setDrawingInProgress,
    ]);

    // Обработчик завершения рисования из родительского компонента
    useEffect(() => {
        if (drawingMode === "polygon" && currentPolygon.length > 0) {
            completePolygon();
        }
    }, [onFinishDrawing]);

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
            setDrawingInProgress(true);
            map.doubleClickZoom.disable();
        },
        [currentPolygon, drawingMode, map, setDrawingInProgress]
    );

    // Начало рисования прямоугольника
    const startRectangle = useCallback(
        (latlng: L.LatLng) => {
            if (drawingMode !== "rectangle") return;

            const pos: Position = [latlng.lat, latlng.lng];
            setRectangleStart(pos);
            setRectangleEnd(pos);
            setDrawingInProgress(true);
        },
        [drawingMode, setDrawingInProgress]
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
            setDrawingMode("none");
            setDrawingInProgress(false);
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
        setDrawingMode("none");
        setDrawingInProgress(false);
    }, [
        rectangleStart,
        rectangleEnd,
        features,
        onFeaturesChange,
        setDrawingMode,
        setDrawingInProgress,
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

        map.on("click", handleClick);
        map.on("mousemove", handleMove);

        return () => {
            map.off("click", handleClick);
            map.off("mousemove", handleMove);
        };
    }, [
        map,
        drawingMode,
        addMarker,
        addPolygonPoint,
        startRectangle,
        updateRectangle,
        finishRectangle,
        rectangleStart,
    ]);

    // Клавиша Escape для отмены рисования
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (currentPolygon.length > 0 || rectangleStart) {
                    setCurrentPolygon([]);
                    setRectangleStart(null);
                    setRectangleEnd(null);
                    setDrawingMode("none");
                    setDrawingInProgress(false);
                    map.doubleClickZoom.enable();
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [
        currentPolygon.length,
        rectangleStart,
        setDrawingMode,
        setDrawingInProgress,
        map,
    ]);

    return (
        <>
            {features.map((feature) => (
                <React.Fragment key={feature.id}>
                    {(mode === "marker" || mode === "all") && feature.position && (
                        <Marker position={feature.position}>
                        </Marker>
                    )}

                    {(mode === "polygon" || mode === "all") && feature.polygon && (
                        <Polygon
                            positions={feature.polygon}
                            pathOptions={{ color: feature.color || "blue" }}
                        >
                        </Polygon>
                    )}

                    {(mode === "rectangle" || mode === "all") && feature.rectangle && (
                        <Rectangle
                            bounds={feature.rectangle}
                            pathOptions={{ color: feature.color || "green" }}
                        >
                        </Rectangle>
                    )}
                </React.Fragment>
            ))}

            {/* Текущий рисуемый полигон */}
            {drawingMode === "polygon" && currentPolygon.length > 0 && (
                <>
                    <Polyline
                        positions={currentPolygon}
                        {...polylineStyle}
                    />
                    {currentPolygon.length > 0 && (
                        <Polyline
                            positions={[
                                currentPolygon[currentPolygon.length - 1],
                                currentPolygon[0],
                            ]}
                            {...polylineStyle}
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
    const [drawingInProgress, setDrawingInProgress] = useState(false);
    const [finishDrawingTrigger, setFinishDrawingTrigger] = useState(0);

    const handleFeaturesChange = useCallback(
        (newFeatures: MapFeature[]) => {
            setFeatures(newFeatures);
            if (onFeaturesChange) {
                onFeaturesChange(newFeatures);
            }
        },
        [onFeaturesChange]
    );

    const toggleDrawingMode = useCallback(
        (mode: "marker" | "polygon" | "rectangle" | "none") => {
            if (drawingInProgress) return;
            setDrawingMode((prev) => (prev === mode ? "none" : mode));
        },
        [drawingInProgress]
    );

    const handleFinishDrawing = useCallback(() => {
        if (drawingMode === "polygon" && drawingInProgress) {
            setFinishDrawingTrigger(prev => prev + 1);
        }
    }, [drawingMode, drawingInProgress]);

    const handleClearAll = useCallback(() => {
        if (drawingInProgress) return;
        handleFeaturesChange([]);
        setDrawingMode("none");
    }, [handleFeaturesChange, drawingInProgress]);

    return (
        <div className={className} style={{ position: "relative", ...style }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: "500px", width: "100%" }}
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
                    // @ts-ignore
                    setDrawingMode={setDrawingMode}
                    onFeaturesChange={handleFeaturesChange}
                    setDrawingInProgress={setDrawingInProgress}
                    // @ts-ignore
                    onFinishDrawing={finishDrawingTrigger}
                />
            </MapContainer>
            {showControls && (
                <ControlPanel
                    position={controlsPosition}
                    onAddMarker={() => toggleDrawingMode("marker")}
                    onAddPolygon={() => toggleDrawingMode("polygon")}
                    onAddRectangle={() => toggleDrawingMode("rectangle")}
                    onClearAll={handleClearAll}
                    onFinishDrawing={handleFinishDrawing}
                    drawingMode={drawingMode}
                    drawingInProgress={drawingInProgress}
                />
            )}
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
                        fontSize: '14px',
                        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
                        zIndex: 1000,
                    }}
                >
                    {drawingInProgress
                        ? "Add more polygon points on the map, then click finish"
                        : "Add a point on the map"}
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
                        fontSize: '14px',
                        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
                        zIndex: 1000,
                    }}
                >
                    Drawing a rectangle: click and drag to create a rectangle
                </div>
            )}

            {drawingMode === "marker" && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "white",
                        padding: "10px",
                        borderRadius: "5px",
                        fontSize: '14px',
                        boxShadow: "0 0 10px rgba(0,0,0,0.2)",
                        zIndex: 1000,
                    }}
                >
                    Put markers on the map, then click the marker again to finish
                </div>
            )}
        </div>
    );
};

export default GeoJsonEditor;
