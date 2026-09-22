"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  uploadAdminProductMedia,
} from "@/lib/admin-client-upload";

type MediaAspect =
  | "1:1"
  | "3:4"
  | "4:5"
  | "9:16"
  | "16:9";

type FitMode =
  | "FILL"
  | "FIT";

type CreatedMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  thumbnailUrl?: string | null;
  altText?: string | null;
  sortOrder: number;
  isActive: boolean;
  colorId?: string | null;
};

type Props = {
  productId: string;
  productName: string;
  colorId: string;
  disabled?: boolean;
  onCreated: (
    media: CreatedMedia,
  ) => void;
};

const RATIO_OPTIONS: Array<{
  key: MediaAspect;
  label: string;
  ratio: number;
  hint?: string;
}> = [
  {
    key: "4:5",
    label: "4:5",
    ratio: 4 / 5,
    hint: "Recommended",
  },
  {
    key: "3:4",
    label: "3:4",
    ratio: 3 / 4,
  },
  {
    key: "1:1",
    label: "1:1",
    ratio: 1,
  },
  {
    key: "9:16",
    label: "9:16",
    ratio: 9 / 16,
  },
  {
    key: "16:9",
    label: "16:9",
    ratio: 16 / 9,
  },
];

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(
    max,
    Math.max(
      min,
      value,
    ),
  );
}

function ratioNumber(
  aspect: MediaAspect,
) {
  return (
    RATIO_OPTIONS.find(
      (item) =>
        item.key === aspect,
    )?.ratio ??
    4 / 5
  );
}

function loadImage(
  url: string,
) {
  return new Promise<HTMLImageElement>(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () =>
        resolve(image);

      image.onerror = () =>
        reject(
          new Error(
            "Image preview could not be prepared.",
          ),
        );

      image.src = url;
    },
  );
}

async function buildFramedImage(
  file: File,
  aspect: MediaAspect,
  fitMode: FitMode,
  zoom: number,
  positionX: number,
  positionY: number,
) {
  const sourceUrl =
    URL.createObjectURL(file);

  try {
    const image =
      await loadImage(
        sourceUrl,
      );

    const ratio =
      ratioNumber(aspect);

    const maxDimension =
      1600;

    const width =
      ratio >= 1
        ? maxDimension
        : Math.round(
            maxDimension *
              ratio,
          );

    const height =
      ratio >= 1
        ? Math.round(
            maxDimension /
              ratio,
          )
        : maxDimension;

    const canvas =
      document.createElement(
        "canvas",
      );

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext(
        "2d",
      );

    if (!context) {
      throw new Error(
        "Image editor is unavailable in this browser.",
      );
    }

    context.fillStyle =
      "#F7F3EA";

    context.fillRect(
      0,
      0,
      width,
      height,
    );

    const baseScale =
      fitMode === "FILL"
        ? Math.max(
            width /
              image.naturalWidth,
            height /
              image.naturalHeight,
          )
        : Math.min(
            width /
              image.naturalWidth,
            height /
              image.naturalHeight,
          );

    const scale =
      baseScale * zoom;

    const drawWidth =
      image.naturalWidth *
      scale;

    const drawHeight =
      image.naturalHeight *
      scale;

    const x =
      (width - drawWidth) *
      (positionX / 100);

    const y =
      (height - drawHeight) *
      (positionY / 100);

    context.imageSmoothingEnabled =
      true;

    context.imageSmoothingQuality =
      "high";

    context.drawImage(
      image,
      x,
      y,
      drawWidth,
      drawHeight,
    );

    const blob =
      await new Promise<Blob>(
        (resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(
                  new Error(
                    "Could not prepare the cropped image.",
                  ),
                );
              }
            },
            "image/webp",
            0.92,
          );
        },
      );

    const baseName =
      file.name
        .replace(
          /\.[^/.]+$/,
          "",
        )
        .replace(
          /[^a-zA-Z0-9._-]/g,
          "-",
        );

    return new File(
      [
        blob,
      ],
      `${baseName || "product"}-${aspect.replace(
        ":",
        "x",
      )}.webp`,
      {
        type:
          "image/webp",
        lastModified:
          Date.now(),
      },
    );
  } finally {
    URL.revokeObjectURL(
      sourceUrl,
    );
  }
}

export default function ProductMediaUploadComposer({
  productId,
  productName,
  colorId,
  disabled = false,
  onCreated,
}: Props) {
  const [file, setFile] =
    useState<File | null>(
      null,
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [aspect, setAspect] =
    useState<MediaAspect>(
      "4:5",
    );

  const [fitMode, setFitMode] =
    useState<FitMode>(
      "FILL",
    );

  const [zoom, setZoom] =
    useState(1);

  const [
    positionX,
    setPositionX,
  ] = useState(50);

  const [
    positionY,
    setPositionY,
  ] = useState(50);

  const [
    sourceSize,
    setSourceSize,
  ] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    progress,
    setProgress,
  ] = useState(0);

  const [
    error,
    setError,
  ] = useState("");

  const dragRef =
    useRef<{
      pointerId: number;
      clientX: number;
      clientY: number;
      x: number;
      y: number;
    } | null>(null);

  const isImage =
    file?.type.startsWith(
      "image/",
    ) === true;

  const isVideo =
    file?.type.startsWith(
      "video/",
    ) === true;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl,
        );
      }
    };
  }, [previewUrl]);

  function resetFraming() {
    setAspect("4:5");
    setFitMode("FILL");
    setZoom(1);
    setPositionX(50);
    setPositionY(50);
  }

  function clearFile() {
    setFile(null);
    setPreviewUrl("");
    setSourceSize(null);
    setProgress(0);
    setError("");
    resetFraming();
  }

  function chooseFile(
    selected: File,
  ) {
    const valid =
      selected.type.startsWith(
        "image/",
      ) ||
      selected.type.startsWith(
        "video/",
      );

    if (!valid) {
      setError(
        "Choose an image or video file.",
      );
      return;
    }

    const maxSize =
      selected.type.startsWith(
        "video/",
      )
        ? 50 *
          1024 *
          1024
        : 10 *
          1024 *
          1024;

    if (
      selected.size >
      maxSize
    ) {
      setError(
        selected.type.startsWith(
          "video/",
        )
          ? "Video must be 50MB or smaller."
          : "Image must be 10MB or smaller.",
      );
      return;
    }

    const nextUrl =
      URL.createObjectURL(
        selected,
      );

    setFile(selected);
    setPreviewUrl(nextUrl);
    setSourceSize(null);
    setProgress(0);
    setError("");
    resetFraming();
  }

  async function uploadSelected() {
    if (
      !file ||
      !colorId ||
      uploading
    ) {
      return;
    }

    try {
      setUploading(true);
      setProgress(0);
      setError("");

      const uploadFile =
        isImage
          ? await buildFramedImage(
              file,
              aspect,
              fitMode,
              zoom,
              positionX,
              positionY,
            )
          : file;

      const uploadData =
        await uploadAdminProductMedia(
          uploadFile,
          setProgress,
        );

      const response =
        await fetch(
          "/api/media",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              productId,
              type:
                uploadData.type,
              url:
                uploadData.url,
              thumbnailUrl:
                null,
              altText:
                productName,
              colorId,
            }),
          },
        );

      const mediaData =
        await response.json();

      if (!response.ok) {
        throw new Error(
          mediaData.error ??
            "Failed to save media.",
        );
      }

      onCreated(
        mediaData,
      );

      clearFile();

      alert(
        isImage
          ? "Image framing saved and uploaded."
          : "Video uploaded successfully.",
      );
    } catch (uploadError) {
      console.error(
        "Product media upload failed:",
        uploadError,
      );

      setError(
        uploadError instanceof
          Error
          ? uploadError.message
          : "Media upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  function startDrag(
    event:
      React.PointerEvent<HTMLDivElement>,
  ) {
    if (
      !isImage ||
      uploading
    ) {
      return;
    }

    dragRef.current = {
      pointerId:
        event.pointerId,
      clientX:
        event.clientX,
      clientY:
        event.clientY,
      x: positionX,
      y: positionY,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  }

  function dragPreview(
    event:
      React.PointerEvent<HTMLDivElement>,
  ) {
    const drag =
      dragRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();

    const deltaX =
      ((event.clientX -
        drag.clientX) /
        Math.max(
          1,
          rect.width,
        )) *
      100;

    const deltaY =
      ((event.clientY -
        drag.clientY) /
        Math.max(
          1,
          rect.height,
        )) *
      100;

    setPositionX(
      clamp(
        drag.x -
          deltaX,
        0,
        100,
      ),
    );

    setPositionY(
      clamp(
        drag.y -
          deltaY,
        0,
        100,
      ),
    );
  }

  function stopDrag(
    event:
      React.PointerEvent<HTMLDivElement>,
  ) {
    if (
      dragRef.current?.pointerId ===
      event.pointerId
    ) {
      dragRef.current =
        null;
    }
  }

  const ratio =
    ratioNumber(aspect);

  return (
    <div className="mt-4">
      <label
        className={`flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed px-4 py-3 transition ${
          disabled ||
          uploading
            ? "pointer-events-none border-white/10 bg-slate-950/60 opacity-50"
            : "border-purple-300/35 bg-purple-400/[0.05] hover:border-purple-300/60"
        }`}
      >
        <div>
          <p className="text-sm font-bold text-slate-100">
            {file
              ? "Choose another file"
              : "Choose Image / Video"}
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            Images 10MB max · Videos 50MB max
          </p>
        </div>

        <span className="rounded-xl bg-purple-300 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-950">
          Browse
        </span>

        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          disabled={
            disabled ||
            uploading
          }
          onChange={(
            event,
          ) => {
            const selected =
              event.target
                .files?.[0];

            if (selected) {
              chooseFile(
                selected,
              );
            }

            event.target.value =
              "";
          }}
        />
      </label>

      {disabled ? (
        <p className="mt-2 text-xs font-semibold text-amber-300">
          Select a media colour first.
        </p>
      ) : null}

      {file &&
      previewUrl ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-300">
                {isImage
                  ? "Image View Editor"
                  : "Video Preview"}
              </p>

              <p className="mt-1 max-w-xl text-[11px] leading-5 text-slate-500">
                {isImage
                  ? "4:5 works best for clean product cards. Pick a ratio, drag the photo, then upload the exact view you want customers to see."
                  : "Video files upload in their original frame."}
              </p>
            </div>

            <button
              type="button"
              onClick={
                clearFile
              }
              disabled={
                uploading
              }
              className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold text-slate-400 disabled:opacity-40"
            >
              Remove
            </button>
          </div>

          {isImage ? (
            <>
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,330px)_1fr]">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Customer Preview
                    </p>

                    <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black text-emerald-300">
                      {aspect}
                    </span>
                  </div>

                  <div
                    onPointerDown={
                      startDrag
                    }
                    onPointerMove={
                      dragPreview
                    }
                    onPointerUp={
                      stopDrag
                    }
                    onPointerCancel={
                      stopDrag
                    }
                    className="relative mt-2 w-full touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-[#F7F3EA] shadow-[0_16px_36px_rgba(0,0,0,0.2)] active:cursor-grabbing"
                    style={{
                      aspectRatio:
                        String(
                          ratio,
                        ),
                    }}
                  >
                    <img
                      src={
                        previewUrl
                      }
                      alt="Product upload preview"
                      draggable={
                        false
                      }
                      onLoad={(
                        event,
                      ) => {
                        setSourceSize(
                          {
                            width:
                              event.currentTarget
                                .naturalWidth,
                            height:
                              event.currentTarget
                                .naturalHeight,
                          },
                        );
                      }}
                      className="pointer-events-none h-full w-full"
                      style={{
                        objectFit:
                          fitMode ===
                          "FILL"
                            ? "cover"
                            : "contain",
                        objectPosition:
                          `${positionX}% ${positionY}%`,
                        transform:
                          `scale(${zoom})`,
                      }}
                    />

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-3 pb-2 pt-8">
                      <p className="text-[9px] font-bold text-white">
                        Drag to reposition
                      </p>
                    </div>
                  </div>

                  {sourceSize ? (
                    <p className="mt-2 text-[10px] text-slate-600">
                      Original:{" "}
                      {
                        sourceSize.width
                      }
                      ×
                      {
                        sourceSize.height
                      } px
                    </p>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                        Aspect Ratio
                      </p>

                      <span className="text-[9px] font-bold text-emerald-300">
                        4:5 recommended
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-5 gap-2">
                      {RATIO_OPTIONS.map(
                        (option) => (
                          <button
                            key={
                              option.key
                            }
                            type="button"
                            onClick={() =>
                              setAspect(
                                option.key,
                              )
                            }
                            disabled={
                              uploading
                            }
                            className={`rounded-xl border px-2 py-2.5 text-center transition ${
                              aspect ===
                              option.key
                                ? "border-purple-300 bg-purple-300 text-slate-950"
                                : "border-white/10 bg-slate-900 text-slate-300"
                            }`}
                          >
                            <span className="block text-[10px] font-black">
                              {
                                option.label
                              }
                            </span>

                            {option.hint ? (
                              <span className="mt-0.5 block text-[6px] font-bold uppercase opacity-70">
                                {
                                  option.hint
                                }
                              </span>
                            ) : null}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                      Image Fit
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFitMode(
                            "FILL",
                          )
                        }
                        className={`rounded-xl border px-3 py-3 text-xs font-bold ${
                          fitMode ===
                          "FILL"
                            ? "border-emerald-300 bg-emerald-300 text-slate-950"
                            : "border-white/10 bg-slate-900 text-slate-300"
                        }`}
                      >
                        Fill Frame
                        <span className="mt-1 block text-[8px] font-medium opacity-70">
                          Clean storefront crop
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFitMode(
                            "FIT",
                          )
                        }
                        className={`rounded-xl border px-3 py-3 text-xs font-bold ${
                          fitMode ===
                          "FIT"
                            ? "border-emerald-300 bg-emerald-300 text-slate-950"
                            : "border-white/10 bg-slate-900 text-slate-300"
                        }`}
                      >
                        Full Image
                        <span className="mt-1 block text-[8px] font-medium opacity-70">
                          Keep whole photo visible
                        </span>
                      </button>
                    </div>
                  </div>

                  <label className="block">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>
                        Zoom
                      </span>
                      <span className="text-slate-200">
                        {zoom.toFixed(
                          2,
                        )}
                        ×
                      </span>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="2.2"
                      step="0.02"
                      value={
                        zoom
                      }
                      disabled={
                        uploading
                      }
                      onChange={(
                        event,
                      ) =>
                        setZoom(
                          Number(
                            event.target
                              .value,
                          ),
                        )
                      }
                      className="mt-2 w-full accent-purple-300"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label>
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                        <span>
                          Horizontal
                        </span>
                        <span>
                          {Math.round(
                            positionX,
                          )}
                          %
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={
                          positionX
                        }
                        disabled={
                          uploading
                        }
                        onChange={(
                          event,
                        ) =>
                          setPositionX(
                            Number(
                              event.target
                                .value,
                            ),
                          )
                        }
                        className="mt-2 w-full accent-purple-300"
                      />
                    </label>

                    <label>
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                        <span>
                          Vertical
                        </span>
                        <span>
                          {Math.round(
                            positionY,
                          )}
                          %
                        </span>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={
                          positionY
                        }
                        disabled={
                          uploading
                        }
                        onChange={(
                          event,
                        ) =>
                          setPositionY(
                            Number(
                              event.target
                                .value,
                            ),
                          )
                        }
                        className="mt-2 w-full accent-purple-300"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={
                      resetFraming
                    }
                    disabled={
                      uploading
                    }
                    className="text-[10px] font-bold text-slate-500 underline underline-offset-4"
                  >
                    Reset framing
                  </button>
                </div>
              </div>
            </>
          ) : isVideo ? (
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video
                src={
                  previewUrl
                }
                controls
                playsInline
                className="aspect-video w-full object-contain"
              />
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300">
              {error}
            </p>
          ) : null}

          {uploading ? (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>
                  Uploading
                </span>
                <span>
                  {progress}%
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-purple-300 transition-all"
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={
              uploadSelected
            }
            disabled={
              uploading ||
              !colorId
            }
            className="mt-4 w-full rounded-xl bg-purple-300 px-4 py-3.5 text-sm font-black text-slate-950 transition hover:bg-purple-200 disabled:opacity-50"
          >
            {uploading
              ? "Saving Product Media..."
              : isImage
                ? "Upload This View"
                : "Upload Video"}
          </button>
        </div>
      ) : error ? (
        <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
