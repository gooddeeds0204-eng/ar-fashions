"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  status: string;
  salesMode: string;
  retailPrice: number;
  resellerPrice: number | null;
  image: string | null;
};

type VideoContent = {
  id: string;
  productId: string;
  type: "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  altText: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  product: Product | null;
};

type SourceMode =
  | "UPLOAD"
  | "INSTAGRAM";

function isInstagramUrl(
  value: string,
) {
  try {
    const url = new URL(value);

    return (
      url.hostname ===
        "instagram.com" ||
      url.hostname.endsWith(
        ".instagram.com",
      )
    );
  } catch {
    return false;
  }
}

function instagramEmbedUrl(
  value: string,
) {
  try {
    const url = new URL(value);

    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);

    if (
      parts.length < 2
    ) {
      return null;
    }

    const type =
      parts[0];

    const code =
      parts[1];

    if (
      type !== "reel" &&
      type !== "reels" &&
      type !== "p"
    ) {
      return null;
    }

    const embedType =
      type === "reels"
        ? "reel"
        : type;

    return `https://www.instagram.com/${embedType}/${code}/embed/`;
  } catch {
    return null;
  }
}

function money(
  value: number,
) {
  return `₹${Number(
    value || 0,
  ).toLocaleString(
    "en-IN",
  )}`;
}

export default function AdminVideoContentPage() {
  const router = useRouter();

  const [
    videos,
    setVideos,
  ] =
    useState<
      VideoContent[]
    >([]);

  const [
    products,
    setProducts,
  ] =
    useState<
      Product[]
    >([]);

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
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    thumbnailUploading,
    setThumbnailUploading,
  ] =
    useState(false);

  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    sourceMode,
    setSourceMode,
  ] =
    useState<SourceMode>(
      "UPLOAD",
    );

  const [
    productId,
    setProductId,
  ] =
    useState("");

  const [
    videoUrl,
    setVideoUrl,
  ] =
    useState("");

  const [
    thumbnailUrl,
    setThumbnailUrl,
  ] =
    useState("");

  const [
    altText,
    setAltText,
  ] =
    useState("");

  const [
    sortOrder,
    setSortOrder,
  ] =
    useState("0");

  const [
    isActive,
    setIsActive,
  ] =
    useState(true);

  const [
    videoFile,
    setVideoFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    thumbnailFile,
    setThumbnailFile,
  ] =
    useState<File | null>(
      null,
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  async function loadData() {
    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/admin/video-content",
          {
            cache:
              "no-store",
          },
        );

      if (
        response.status ===
        401
      ) {
        router.push(
          "/admin/login",
        );

        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to load video content.",
        );
      }

      setVideos(
        Array.isArray(
          data.videos,
        )
          ? data.videos
          : [],
      );

      setProducts(
        Array.isArray(
          data.products,
        )
          ? data.products
          : [],
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load video content.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedProduct =
    useMemo(
      () =>
        products.find(
          (product) =>
            product.id ===
            productId,
        ) ?? null,
      [
        products,
        productId,
      ],
    );

  const filteredVideos =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return videos;
      }

      return videos.filter(
        (video) =>
          video.product?.name
            .toLowerCase()
            .includes(query) ||
          video.product?.sku
            ?.toLowerCase()
            .includes(query) ||
          video.altText
            ?.toLowerCase()
            .includes(query),
      );
    }, [
      videos,
      search,
    ]);

  function resetForm() {
    setEditingId(null);
    setSourceMode(
      "UPLOAD",
    );
    setProductId("");
    setVideoUrl("");
    setThumbnailUrl("");
    setAltText("");
    setSortOrder("0");
    setIsActive(true);
    setVideoFile(null);
    setThumbnailFile(
      null,
    );
  }

  async function uploadMedia(
    file: File,
  ) {
    const formData =
      new FormData();

    formData.append(
      "file",
      file,
    );

    const response =
      await fetch(
        "/api/upload",
        {
          method: "POST",
          body: formData,
        },
      );

    if (
      response.status ===
      401
    ) {
      router.push(
        "/admin/login",
      );

      throw new Error(
        "Admin session expired.",
      );
    }

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ??
          "Upload failed.",
      );
    }

    return data;
  }

  async function uploadVideo() {
    if (!videoFile) {
      setMessage(
        "Choose a video first.",
      );

      return;
    }

    try {
      setUploading(true);
      setMessage("");

      const data =
        await uploadMedia(
          videoFile,
        );

      if (
        data.type !==
        "VIDEO"
      ) {
        throw new Error(
          "Selected file is not a video.",
        );
      }

      setVideoUrl(
        data.url,
      );

      setMessage(
        "Video uploaded successfully.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Video upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function uploadThumbnail() {
    if (!thumbnailFile) {
      setMessage(
        "Choose a thumbnail image first.",
      );

      return;
    }

    try {
      setThumbnailUploading(
        true,
      );

      setMessage("");

      const data =
        await uploadMedia(
          thumbnailFile,
        );

      if (
        data.type !==
        "IMAGE"
      ) {
        throw new Error(
          "Thumbnail must be an image.",
        );
      }

      setThumbnailUrl(
        data.url,
      );

      setMessage(
        "Thumbnail uploaded successfully.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Thumbnail upload failed.",
      );
    } finally {
      setThumbnailUploading(
        false,
      );
    }
  }

  async function saveVideo() {
    if (!productId) {
      setMessage(
        "Select a product.",
      );

      return;
    }

    if (!videoUrl.trim()) {
      setMessage(
        sourceMode ===
          "INSTAGRAM"
          ? "Enter Instagram Reel link."
          : "Upload a video first.",
      );

      return;
    }

    if (
      sourceMode ===
        "INSTAGRAM" &&
      !isInstagramUrl(
        videoUrl,
      )
    ) {
      setMessage(
        "Enter a valid Instagram link.",
      );

      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const response =
        await fetch(
          "/api/admin/video-content",
          {
            method:
              editingId
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                ...(editingId
                  ? {
                      id:
                        editingId,
                    }
                  : {}),

                productId,

                url:
                  videoUrl.trim(),

                thumbnailUrl:
                  thumbnailUrl.trim() ||
                  null,

                altText:
                  altText.trim() ||
                  null,

                sortOrder:
                  Number(
                    sortOrder,
                  ),

                isActive,
              }),
          },
        );

      if (
        response.status ===
        401
      ) {
        router.push(
          "/admin/login",
        );

        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to save video.",
        );
      }

      const wasEditing =
        Boolean(
          editingId,
        );

      resetForm();

      await loadData();

      setMessage(
        wasEditing
          ? "Video updated."
          : "Video content created.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save video.",
      );
    } finally {
      setSaving(false);
    }
  }

  function editVideo(
    video: VideoContent,
  ) {
    setEditingId(
      video.id,
    );

    setProductId(
      video.productId,
    );

    setVideoUrl(
      video.url,
    );

    setThumbnailUrl(
      video.thumbnailUrl ??
        "",
    );

    setAltText(
      video.altText ??
        "",
    );

    setSortOrder(
      String(
        video.sortOrder,
      ),
    );

    setIsActive(
      video.isActive,
    );

    setSourceMode(
      isInstagramUrl(
        video.url,
      )
        ? "INSTAGRAM"
        : "UPLOAD",
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function toggleVideo(
    video: VideoContent,
  ) {
    try {
      const response =
        await fetch(
          "/api/admin/video-content",
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
                  video.id,

                isActive:
                  !video.isActive,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update video.",
        );
      }

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update video.",
      );
    }
  }

  async function removeVideo(
    video: VideoContent,
  ) {
    const confirmed =
      window.confirm(
        `Remove video for "${video.product?.name ?? "product"}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/admin/video-content",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                id:
                  video.id,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to remove video.",
        );
      }

      await loadData();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to remove video.",
      );
    }
  }

  const previewInstagram =
    sourceMode ===
      "INSTAGRAM"
      ? instagramEmbedUrl(
          videoUrl,
        )
      : null;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin",
              )
            }
            className="rounded-xl border bg-white px-3 py-2 text-sm font-black"
          >
            ←
          </button>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              AR Fashions Admin
            </p>

            <h1 className="text-xl font-black">
              Video Content
            </h1>
          </div>
        </div>

        {message ? (
          <div className="mb-5 rounded-2xl border bg-white p-4 text-sm font-semibold">
            {message}
          </div>
        ) : null}

        <section className="rounded-3xl border bg-white p-4 sm:p-6">
          <h2 className="text-lg font-black">
            {editingId
              ? "Edit Reel"
              : "Create Reel"}
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Upload a reel or attach a public Instagram Reel link.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => {
                setSourceMode(
                  "UPLOAD",
                );

                if (
                  isInstagramUrl(
                    videoUrl,
                  )
                ) {
                  setVideoUrl(
                    "",
                  );
                }
              }}
              className={`rounded-xl px-3 py-3 text-xs font-black ${
                sourceMode ===
                "UPLOAD"
                  ? "bg-black text-white"
                  : ""
              }`}
            >
              Upload Video
            </button>

            <button
              type="button"
              onClick={() => {
                setSourceMode(
                  "INSTAGRAM",
                );

                if (
                  videoUrl &&
                  !isInstagramUrl(
                    videoUrl,
                  )
                ) {
                  setVideoUrl(
                    "",
                  );
                }
              }}
              className={`rounded-xl px-3 py-3 text-xs font-black ${
                sourceMode ===
                "INSTAGRAM"
                  ? "bg-black text-white"
                  : ""
              }`}
            >
              Instagram Link
            </button>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-black">
              Product
            </span>

            <select
              value={productId}
              onChange={(
                event,
              ) =>
                setProductId(
                  event.target
                    .value,
                )
              }
              className="w-full rounded-xl border px-3 py-3 text-sm"
            >
              <option value="">
                Select product
              </option>

              {products.map(
                (product) => (
                  <option
                    key={
                      product.id
                    }
                    value={
                      product.id
                    }
                  >
                    {
                      product.name
                    }{" "}
                    {product.sku
                      ? `· ${product.sku}`
                      : ""}
                  </option>
                ),
              )}
            </select>
          </label>

          {selectedProduct ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-zinc-50 p-3">
              <div className="h-16 w-14 overflow-hidden rounded-xl bg-zinc-100">
                {selectedProduct.image ? (
                  <img
                    src={
                      selectedProduct.image
                    }
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div>
                <p className="text-sm font-black">
                  {
                    selectedProduct.name
                  }
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  {money(
                    selectedProduct.resellerPrice ??
                      selectedProduct.retailPrice,
                  )}
                </p>
              </div>
            </div>
          ) : null}

          {sourceMode ===
          "UPLOAD" ? (
            <div className="mt-5">
              <p className="mb-2 text-xs font-black">
                Video File
              </p>

              <input
                type="file"
                accept="video/*"
                onChange={(
                  event,
                ) =>
                  setVideoFile(
                    event.target
                      .files?.[0] ??
                      null,
                  )
                }
                className="w-full rounded-xl border p-3 text-sm"
              />

              <button
                type="button"
                disabled={
                  !videoFile ||
                  uploading
                }
                onClick={
                  uploadVideo
                }
                className="mt-3 w-full rounded-xl bg-zinc-950 py-3 text-xs font-black text-white disabled:bg-zinc-300"
              >
                {uploading
                  ? "Uploading..."
                  : "Upload Selected Video"}
              </button>
            </div>
          ) : (
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-black">
                Instagram Reel Link
              </span>

              <input
                value={
                  videoUrl
                }
                onChange={(
                  event,
                ) =>
                  setVideoUrl(
                    event.target
                      .value,
                  )
                }
                placeholder="https://www.instagram.com/reel/..."
                className="w-full rounded-xl border px-3 py-3 text-sm"
              />

              <p className="mt-2 text-[11px] text-zinc-500">
                Public Instagram Reel/Post only.
              </p>
            </label>
          )}

          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-black">
              Caption
            </span>

            <input
              value={altText}
              onChange={(
                event,
              ) =>
                setAltText(
                  event.target
                    .value,
                )
              }
              placeholder="New style just dropped ✨"
              className="w-full rounded-xl border px-3 py-3 text-sm"
            />
          </label>

          <div className="mt-5">
            <p className="mb-2 text-xs font-black">
              Thumbnail
            </p>

            <input
              type="file"
              accept="image/*"
              onChange={(
                event,
              ) =>
                setThumbnailFile(
                  event.target
                    .files?.[0] ??
                    null,
                )
              }
              className="w-full rounded-xl border p-3 text-sm"
            />

            <button
              type="button"
              disabled={
                !thumbnailFile ||
                thumbnailUploading
              }
              onClick={
                uploadThumbnail
              }
              className="mt-3 w-full rounded-xl border py-3 text-xs font-black disabled:text-zinc-300"
            >
              {thumbnailUploading
                ? "Uploading Thumbnail..."
                : "Upload Thumbnail"}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <label>
              <span className="mb-2 block text-xs font-black">
                Sort Order
              </span>

              <input
                type="number"
                min="0"
                value={
                  sortOrder
                }
                onChange={(
                  event,
                ) =>
                  setSortOrder(
                    event.target
                      .value,
                  )
                }
                className="w-full rounded-xl border px-3 py-3 text-sm"
              />
            </label>

            <label className="flex items-end">
              <span className="flex w-full items-center gap-2 rounded-xl border px-3 py-3 text-sm font-black">
                <input
                  type="checkbox"
                  checked={
                    isActive
                  }
                  onChange={(
                    event,
                  ) =>
                    setIsActive(
                      event.target
                        .checked,
                    )
                  }
                />

                Active Reel
              </span>
            </label>
          </div>

          {videoUrl ? (
            <div className="mt-6">
              <p className="mb-3 text-xs font-black">
                Preview
              </p>

              <div className="mx-auto max-w-[300px] overflow-hidden rounded-3xl bg-black">
                {sourceMode ===
                  "INSTAGRAM" &&
                previewInstagram ? (
                  <iframe
                    src={
                      previewInstagram
                    }
                    title="Instagram Reel"
                    className="aspect-[9/16] w-full bg-white"
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <video
                    src={
                      videoUrl
                    }
                    poster={
                      thumbnailUrl ||
                      undefined
                    }
                    controls
                    playsInline
                    className="aspect-[9/16] w-full object-cover"
                  />
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            {editingId ? (
              <button
                type="button"
                onClick={
                  resetForm
                }
                className="flex-1 rounded-xl border px-4 py-3 text-sm font-black"
              >
                Cancel
              </button>
            ) : null}

            <button
              type="button"
              disabled={
                saving
              }
              onClick={
                saveVideo
              }
              className="flex-[2] rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:bg-zinc-300"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Reel"
                  : "Create Reel"}
            </button>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black">
              Reels Library
            </h2>

            <span className="text-xs text-zinc-500">
              {
                videos.length
              }{" "}
              total
            </span>
          </div>

          <input
            value={search}
            onChange={(
              event,
            ) =>
              setSearch(
                event.target
                  .value,
              )
            }
            placeholder="Search product, SKU or caption..."
            className="mb-5 w-full rounded-xl border bg-white px-4 py-3 text-sm"
          />

          {loading ? (
            <div className="rounded-2xl border bg-white p-6 text-center text-sm text-zinc-500">
              Loading reels...
            </div>
          ) : filteredVideos.length ===
            0 ? (
            <div className="rounded-2xl border bg-white p-6 text-center text-sm text-zinc-500">
              No reels yet.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVideos.map(
                (video) => {
                  const instagram =
                    isInstagramUrl(
                      video.url,
                    );

                  const embed =
                    instagram
                      ? instagramEmbedUrl(
                          video.url,
                        )
                      : null;

                  return (
                    <article
                      key={
                        video.id
                      }
                      className="overflow-hidden rounded-3xl border bg-white"
                    >
                      <div className="aspect-[9/14] bg-black">
                        {instagram &&
                        embed ? (
                          <iframe
                            src={
                              embed
                            }
                            title={
                              video.altText ??
                              "Instagram Reel"
                            }
                            className="h-full w-full bg-white"
                            allow="autoplay; encrypted-media"
                          />
                        ) : (
                          <video
                            src={
                              video.url
                            }
                            poster={
                              video.thumbnailUrl ??
                              undefined
                            }
                            muted
                            controls
                            playsInline
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[9px] font-black">
                            {instagram
                              ? "INSTAGRAM"
                              : "UPLOAD"}
                          </span>

                          <span
                            className={`rounded-full px-2 py-1 text-[9px] font-black ${
                              video.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {video.isActive
                              ? "ACTIVE"
                              : "INACTIVE"}
                          </span>
                        </div>

                        <h3 className="mt-3 text-sm font-black">
                          {video.product
                            ?.name ??
                            "Product"}
                        </h3>

                        {video.altText ? (
                          <p className="mt-2 text-xs leading-5 text-zinc-500">
                            {
                              video.altText
                            }
                          </p>
                        ) : null}

                        <p className="mt-2 text-[10px] text-zinc-400">
                          Sort{" "}
                          {
                            video.sortOrder
                          }
                        </p>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              editVideo(
                                video,
                              )
                            }
                            className="rounded-xl bg-zinc-100 py-3 text-xs font-black"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleVideo(
                                video,
                              )
                            }
                            className="rounded-xl bg-amber-50 py-3 text-xs font-black text-amber-700"
                          >
                            {video.isActive
                              ? "Disable"
                              : "Enable"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeVideo(
                                video,
                              )
                            }
                            className="rounded-xl bg-red-50 py-3 text-xs font-black text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
