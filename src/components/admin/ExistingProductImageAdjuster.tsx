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

type UpdatedMedia = {
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
  mediaId: string;
  imageUrl: string;
  productName: string;
  onCancel: () => void;
  onSaved: (
    media: UpdatedMedia,
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

function nearestAspect(
  ratio: number,
): MediaAspect {
  return RATIO_OPTIONS.reduce(
    (best, option) =>
      Math.abs(
        option.ratio -
          ratio,
      ) <
      Math.abs(
        best.ratio -
          ratio,
      )
        ? option
        : best,
    RATIO_OPTIONS[0],
  ).key;
}

function loadImage(
  url: string,
) {
  return new Promise<HTMLImageElement>(
    (
      resolve,
      reject,
    ) => {
      const image =
        new Image();

      image.onload = () =>
        resolve(image);

      image.onerror = () =>
        reject(
          new Error(
            "Image could not be prepared for editing.",
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
    URL.createObjectURL(
      file,
    );

  try {
    const image =
      await loadImage(
        sourceUrl,
      );

    const ratio =
      ratioNumber(
        aspect,
      );

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

    canvas.width =
      width;
    canvas.height =
      height;

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
      fitMode ===
      "FILL"
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
      baseScale *
      zoom;

    const drawWidth =
      image.naturalWidth *
      scale;

    const drawHeight =
      image.naturalHeight *
      scale;

    const x =
      (width -
        drawWidth) *
      (positionX /
        100);

    const y =
      (height -
        drawHeight) *
      (positionY /
        100);

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
        (
          resolve,
          reject,
        ) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(
                  result,
                );
              } else {
                reject(
                  new Error(
                    "Could not prepare the adjusted image.",
                  ),
                );
              }
            },
            "image/webp",
            0.92,
          );
        },
      );

    return new File(
      [blob],
      `adjusted-${Date.now()}.webp`,
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

export default function ExistingProductImageAdjuster({
  mediaId,
  imageUrl,
  productName,
  onCancel,
  onSaved,
}: Props) {
  const [
    sourceFile,
    setSourceFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState("");

  const [
    aspect,
    setAspect,
  ] =
    useState<MediaAspect>(
      "4:5",
    );

  const [
    fitMode,
    setFitMode,
  ] =
    useState<FitMode>(
      "FILL",
    );

  const [
    zoom,
    setZoom,
  ] =
    useState(1);

  const [
    positionX,
    setPositionX,
  ] =
    useState(50);

  const [
    positionY,
    setPositionY,
  ] =
    useState(50);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    progress,
    setProgress,
  ] =
    useState(0);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    sourceSize,
    setSourceSize,
  ] =
    useState<{
      width: number;
      height: number;
    } | null>(
      null,
    );

  const initializedAspect =
    useRef(false);

  const dragRef =
    useRef<{
      pointerId: number;
      clientX: number;
      clientY: number;
      x: number;
      y: number;
    } | null>(
      null,
    );

  useEffect(() => {
    let cancelled =
      false;

    let nextPreview =
      "";

    async function prepare() {
      try {
        setLoading(
          true,
        );
        setError("");

        const response =
          await fetch(
            imageUrl,
            {
              cache:
                "no-store",
            },
          );

        if (
          !response.ok
        ) {
          throw new Error(
            "Could not load the existing image.",
          );
        }

        const blob =
          await response.blob();

        if (
          !blob.type.startsWith(
            "image/",
          )
        ) {
          throw new Error(
            "This media is not an editable image.",
          );
        }

        const extension =
          blob.type.includes(
            "png",
          )
            ? "png"
            : blob.type.includes(
                  "webp",
                )
              ? "webp"
              : "jpg";

        const file =
          new File(
            [blob],
            `product-image.${extension}`,
            {
              type:
                blob.type,
              lastModified:
                Date.now(),
            },
          );

        nextPreview =
          URL.createObjectURL(
            file,
          );

        if (
          cancelled
        ) {
          URL.revokeObjectURL(
            nextPreview,
          );
          return;
        }

        setSourceFile(
          file,
        );
        setPreviewUrl(
          nextPreview,
        );
      } catch (
        loadError
      ) {
        if (
          cancelled
        ) {
          return;
        }

        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Could not prepare this image.",
        );
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false,
          );
        }
      }
    }

    prepare();

    return () => {
      cancelled =
        true;

      if (
        nextPreview
      ) {
        URL.revokeObjectURL(
          nextPreview,
        );
      }
    };
  }, [
    imageUrl,
  ]);

  function resetFraming() {
    setFitMode(
      "FILL",
    );
    setZoom(1);
    setPositionX(
      50,
    );
    setPositionY(
      50,
    );

    if (
      sourceSize
    ) {
      setAspect(
        nearestAspect(
          sourceSize.width /
            sourceSize.height,
        ),
      );
    } else {
      setAspect(
        "4:5",
      );
    }
  }

  function startDrag(
    event:
      React.PointerEvent<HTMLDivElement>,
  ) {
    if (
      saving ||
      !sourceFile
    ) {
      return;
    }

    dragRef.current =
      {
        pointerId:
          event.pointerId,
        clientX:
          event.clientX,
        clientY:
          event.clientY,
        x:
          positionX,
        y:
          positionY,
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
      dragRef.current
        ?.pointerId ===
      event.pointerId
    ) {
      dragRef.current =
        null;
    }
  }

  async function saveAdjustment() {
    if (
      !sourceFile ||
      saving
    ) {
      return;
    }

    try {
      setSaving(
        true,
      );
      setProgress(
        0,
      );
      setError("");

      const adjustedFile =
        await buildFramedImage(
          sourceFile,
          aspect,
          fitMode,
          zoom,
          positionX,
          positionY,
        );

      const uploadData =
        await uploadAdminProductMedia(
          adjustedFile,
          setProgress,
        );

      const response =
        await fetch(
          "/api/media",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                id:
                  mediaId,
                type:
                  "IMAGE",
                url:
                  uploadData.url,
                thumbnailUrl:
                  null,
                altText:
                  productName,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ??
            "Failed to save image adjustment.",
        );
      }

      onSaved(
        data,
      );
    } catch (
      saveError
    ) {
      console.error(
        "Adjust product image failed:",
        saveError,
      );

      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Failed to save image adjustment.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  const ratio =
    ratioNumber(
      aspect,
    );

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/80 px-3 py-4 backdrop-blur-sm sm:px-6 sm:py-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[#07111f] p-4 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
              Product Image Editor
            </p>

            <h3 className="mt-1 text-xl font-black text-white">
              Adjust uploaded image
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Change ratio, fill mode, zoom or position. Saving replaces this image view without changing the product or colour assignment.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onCancel
            }
            disabled={
              saving
            }
            className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-40"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center text-sm font-semibold text-slate-300">
            Preparing image editor...
          </div>
        ) : error &&
          !sourceFile ? (
          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-semibold text-red-300">
            {error}
          </div>
        ) : sourceFile &&
          previewUrl ? (
          <>
            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
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
                  className="relative mt-2 w-full touch-none select-none overflow-hidden rounded-2xl border border-white/10 bg-[#F7F3EA] active:cursor-grabbing"
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
                    alt="Existing product image adjustment preview"
                    draggable={
                      false
                    }
                    onLoad={(
                      event,
                    ) => {
                      const nextSize =
                        {
                          width:
                            event.currentTarget
                              .naturalWidth,
                          height:
                            event.currentTarget
                              .naturalHeight,
                        };

                      setSourceSize(
                        nextSize,
                      );

                      if (
                        !initializedAspect.current &&
                        nextSize.height >
                          0
                      ) {
                        initializedAspect.current =
                          true;

                        setAspect(
                          nearestAspect(
                            nextSize.width /
                              nextSize.height,
                          ),
                        );
                      }
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

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 pb-2 pt-8">
                    <p className="text-[9px] font-bold text-white">
                      Drag image to reposition
                    </p>
                  </div>
                </div>

                {sourceSize ? (
                  <p className="mt-2 text-[10px] text-slate-500">
                    Current source:{" "}
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

              <div className="space-y-5">
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
                      (
                        option,
                      ) => (
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
                            saving
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
                      disabled={
                        saving
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
                        Crop cleanly to the selected frame
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFitMode(
                          "FIT",
                        )
                      }
                      disabled={
                        saving
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
                        Keep the complete current image visible
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
                      saving
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
                        saving
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
                        saving
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
                    saving
                  }
                  className="text-[10px] font-bold text-slate-500 underline underline-offset-4"
                >
                  Reset framing
                </button>
              </div>
            </div>

            {error ? (
              <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300">
                {error}
              </p>
            ) : null}

            {saving ? (
              <div className="mt-5">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                  <span>
                    Saving adjusted image
                  </span>

                  <span>
                    {progress}%
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-300 transition-all"
                    style={{
                      width:
                        `${progress}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={
                  onCancel
                }
                disabled={
                  saving
                }
                className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-300 disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  saveAdjustment
                }
                disabled={
                  saving ||
                  !sourceFile
                }
                className="rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-200 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Adjustment"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
