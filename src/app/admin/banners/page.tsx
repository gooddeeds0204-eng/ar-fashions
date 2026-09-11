"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type BannerPlacement =
  | "HOME_HERO"
  | "HOME_MIDDLE"
  | "HOME_BOTTOM"
  | "SHOP_TOP"
  | "RESELLER_TOP";

type BannerContentType =
  | "IMAGE"
  | "VIDEO"
  | "GRAPHIC";

type BannerAudience =
  | "ALL"
  | "RETAIL"
  | "RESELLER";

type BannerTextAlign =
  | "LEFT"
  | "CENTER"
  | "RIGHT";

type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;

  imageUrl: string | null;
  videoUrl: string | null;
  mobileImageUrl: string | null;
  mobileVideoUrl: string | null;

  buttonText: string | null;
  buttonUrl: string | null;

  placement: BannerPlacement;
  contentType: BannerContentType;
  audience: BannerAudience;

  backgroundColor: string | null;
  backgroundGradient: string | null;
  textColor: string | null;
  textAlign: BannerTextAlign;
  overlayOpacity: number;

  isActive: boolean;
  sortOrder: number;

  startsAt: string | null;
  expiresAt: string | null;
};

type FormState = {
  title: string;
  subtitle: string;

  imageUrl: string;
  videoUrl: string;
  mobileImageUrl: string;
  mobileVideoUrl: string;

  buttonText: string;
  buttonUrl: string;

  placement: BannerPlacement;
  contentType: BannerContentType;
  audience: BannerAudience;

  backgroundColor: string;
  backgroundGradient: string;
  textColor: string;
  textAlign: BannerTextAlign;
  overlayOpacity: string;

  sortOrder: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const placementLabels: Record<
  BannerPlacement,
  string
> = {
  HOME_HERO: "Home Hero",
  HOME_MIDDLE: "Home Middle",
  HOME_BOTTOM: "Home Bottom",
  SHOP_TOP: "Shop Top",
  RESELLER_TOP: "Reseller Zone",
};

const typeLabels: Record<
  BannerContentType,
  string
> = {
  IMAGE: "Image Banner",
  VIDEO: "Video Banner",
  GRAPHIC: "Graphic Banner",
};

const audienceLabels: Record<
  BannerAudience,
  string
> = {
  ALL: "All Customers",
  RETAIL: "Retail Only",
  RESELLER: "Reseller Only",
};

const emptyForm: FormState = {
  title: "",
  subtitle: "",

  imageUrl: "",
  videoUrl: "",
  mobileImageUrl: "",
  mobileVideoUrl: "",

  buttonText: "",
  buttonUrl: "",

  placement: "HOME_HERO",
  contentType: "IMAGE",
  audience: "ALL",

  backgroundColor: "#18181b",
  backgroundGradient: "",
  textColor: "#ffffff",
  textAlign: "LEFT",
  overlayOpacity: "40",

  sortOrder: "0",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

function dateInput(
  value: string | null,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() *
        60000,
  );

  return local
    .toISOString()
    .slice(0, 16);
}

export default function AdminBannersPage() {
  const router = useRouter();

  const [banners, setBanners] =
    useState<Banner[]>([]);

  const [form, setForm] =
    useState<FormState>({
      ...emptyForm,
    });

  const [
    editingId,
    setEditingId,
  ] =
    useState<string | null>(
      null,
    );

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
    uploadingTarget,
    setUploadingTarget,
  ] = useState<
    "DESKTOP" | "MOBILE" | null
  >(null);

  const [
    previewDevice,
    setPreviewDevice,
  ] = useState<
    "DESKTOP" | "MOBILE"
  >("MOBILE");

  const [
    placementFilter,
    setPlacementFilter,
  ] = useState<
    "ALL" | BannerPlacement
  >("ALL");

  async function loadBanners() {
    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/admin/banners",
          {
            cache: "no-store",
            credentials:
              "same-origin",
          },
        );

      if (
        response.status === 401
      ) {
        router.replace(
          "/admin/login",
        );
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to load banners.",
        );
      }

      setBanners(
        Array.isArray(
          data.banners,
        )
          ? data.banners
          : [],
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load banners.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBanners();
  }, []);

  async function uploadMedia(
    event: ChangeEvent<HTMLInputElement>,
    target:
      | "DESKTOP"
      | "MOBILE",
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setUploadingTarget(
        target,
      );

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
            credentials:
              "same-origin",
            body: formData,
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Upload failed.",
        );
      }

      const uploadedType =
        data.type === "VIDEO"
          ? "VIDEO"
          : "IMAGE";

      if (
        uploadedType !==
        form.contentType
      ) {
        throw new Error(
          form.contentType ===
            "IMAGE"
            ? "Please upload an image for an Image Banner."
            : "Please upload a video for a Video Banner.",
        );
      }

      setForm(
        (current) => {
          if (
            target ===
              "DESKTOP" &&
            uploadedType ===
              "VIDEO"
          ) {
            return {
              ...current,
              videoUrl:
                data.url,
              imageUrl: "",
            };
          }

          if (
            target ===
              "DESKTOP"
          ) {
            return {
              ...current,
              imageUrl:
                data.url,
              videoUrl: "",
            };
          }

          if (
            uploadedType ===
            "VIDEO"
          ) {
            return {
              ...current,
              mobileVideoUrl:
                data.url,
              mobileImageUrl:
                "",
            };
          }

          return {
            ...current,
            mobileImageUrl:
              data.url,
            mobileVideoUrl:
              "",
          };
        },
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Upload failed.",
      );
    } finally {
      setUploadingTarget(
        null,
      );

      event.target.value =
        "";
    }
  }

  function resetForm() {
    setEditingId(null);

    setForm({
      ...emptyForm,
    });

    setPreviewDevice(
      "MOBILE",
    );
  }

  function editBanner(
    banner: Banner,
  ) {
    setEditingId(
      banner.id,
    );

    setForm({
      title:
        banner.title ?? "",

      subtitle:
        banner.subtitle ?? "",

      imageUrl:
        banner.imageUrl ?? "",

      videoUrl:
        banner.videoUrl ?? "",

      mobileImageUrl:
        banner.mobileImageUrl ??
        "",

      mobileVideoUrl:
        banner.mobileVideoUrl ??
        "",

      buttonText:
        banner.buttonText ?? "",

      buttonUrl:
        banner.buttonUrl ?? "",

      placement:
        banner.placement ??
        "HOME_HERO",

      contentType:
        banner.contentType ??
        (banner.videoUrl
          ? "VIDEO"
          : "IMAGE"),

      audience:
        banner.audience ?? "ALL",

      backgroundColor:
        banner.backgroundColor ??
        "#18181b",

      backgroundGradient:
        banner.backgroundGradient ??
        "",

      textColor:
        banner.textColor ??
        "#ffffff",

      textAlign:
        banner.textAlign ??
        "LEFT",

      overlayOpacity:
        String(
          banner.overlayOpacity ??
            40,
        ),

      sortOrder:
        String(
          banner.sortOrder,
        ),

      startsAt:
        dateInput(
          banner.startsAt,
        ),

      expiresAt:
        dateInput(
          banner.expiresAt,
        ),

      isActive:
        banner.isActive,
    });

    requestAnimationFrame(
      () => {
        document
          .getElementById(
            "promo-content-form",
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block:
              "start",
          });
      },
    );
  }

  function changeContentType(
    contentType:
      BannerContentType,
  ) {
    setForm(
      (current) => ({
        ...current,
        contentType,
      }),
    );
  }

  async function saveBanner(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      form.contentType ===
        "IMAGE" &&
      !form.imageUrl &&
      !form.mobileImageUrl
    ) {
      alert(
        "Upload a desktop or mobile image.",
      );
      return;
    }

    if (
      form.contentType ===
        "VIDEO" &&
      !form.videoUrl &&
      !form.mobileVideoUrl
    ) {
      alert(
        "Upload a desktop or mobile video.",
      );
      return;
    }

    if (
      form.contentType ===
        "GRAPHIC" &&
      !form.title.trim() &&
      !form.subtitle.trim()
    ) {
      alert(
        "Graphic banner needs a title or subtitle.",
      );
      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          "/api/admin/banners",
          {
            method:
              editingId
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                ...(editingId
                  ? {
                      id:
                        editingId,
                    }
                  : {}),

                ...form,

                sortOrder:
                  Number(
                    form.sortOrder,
                  ),

                overlayOpacity:
                  Number(
                    form.overlayOpacity,
                  ),
              }),
          },
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        router.replace(
          "/admin/login",
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to save content.",
        );
      }

      resetForm();

      await loadBanners();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save content.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleBanner(
    banner: Banner,
  ) {
    try {
      const response =
        await fetch(
          "/api/admin/banners",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                id:
                  banner.id,

                isActive:
                  !banner.isActive,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Update failed.",
        );
      }

      await loadBanners();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Update failed.",
      );
    }
  }

  async function deleteBanner(
    banner: Banner,
  ) {
    if (
      !confirm(
        `Delete ${
          banner.title ??
          "this promo content"
        }?`,
      )
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/admin/banners",
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                id:
                  banner.id,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Delete failed.",
        );
      }

      if (
        editingId ===
        banner.id
      ) {
        resetForm();
      }

      await loadBanners();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Delete failed.",
      );
    }
  }

  const filteredBanners =
    placementFilter ===
    "ALL"
      ? banners
      : banners.filter(
          (banner) =>
            banner.placement ===
            placementFilter,
        );

  const previewImage =
    previewDevice ===
      "MOBILE"
      ? form.mobileImageUrl ||
        form.imageUrl
      : form.imageUrl ||
        form.mobileImageUrl;

  const previewVideo =
    previewDevice ===
      "MOBILE"
      ? form.mobileVideoUrl ||
        form.videoUrl
      : form.videoUrl ||
        form.mobileVideoUrl;

  const previewBackground =
    form.backgroundGradient.trim() ||
    form.backgroundColor ||
    "#18181b";

  const previewAlignment =
    form.textAlign ===
    "CENTER"
      ? "items-center text-center"
      : form.textAlign ===
          "RIGHT"
        ? "items-end text-right"
        : "items-start text-left";

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-zinc-900">
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin",
              )
            }
            className="rounded-xl px-3 py-2 font-bold"
          >
            ←
          </button>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-400">
              AR Fashions Admin
            </p>

            <h1 className="text-lg font-black">
              Promo Content Manager
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="rounded-3xl bg-zinc-950 p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">
            Flexible storefront content
          </p>

          <h2 className="mt-2 text-xl font-black">
            Banners, videos &
            graphics anywhere
          </h2>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Choose placement,
            audience and creative
            type. Mobile and desktop
            media can be managed
            separately.
          </p>
        </section>

        <form
          id="promo-content-form"
          onSubmit={
            saveBanner
          }
          className="rounded-3xl bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Creative
              </p>

              <h2 className="mt-1 text-lg font-black">
                {editingId
                  ? "Edit Promo Content"
                  : "Create Promo Content"}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={
                  resetForm
                }
                className="text-xs font-black text-zinc-500"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="text-xs font-bold text-zinc-500">
              Placement

              <select
                value={
                  form.placement
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    placement:
                      e.target
                        .value as BannerPlacement,
                  })
                }
                className="mt-2 w-full rounded-xl border px-4 py-3 text-sm font-bold text-zinc-900"
              >
                {Object.entries(
                  placementLabels,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="text-xs font-bold text-zinc-500">
              Content Type

              <select
                value={
                  form.contentType
                }
                onChange={(e) =>
                  changeContentType(
                    e.target
                      .value as BannerContentType,
                  )
                }
                className="mt-2 w-full rounded-xl border px-4 py-3 text-sm font-bold text-zinc-900"
              >
                {Object.entries(
                  typeLabels,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="text-xs font-bold text-zinc-500">
              Audience

              <select
                value={
                  form.audience
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    audience:
                      e.target
                        .value as BannerAudience,
                  })
                }
                className="mt-2 w-full rounded-xl border px-4 py-3 text-sm font-bold text-zinc-900"
              >
                {Object.entries(
                  audienceLabels,
                ).map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {label}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          {form.contentType !==
            "GRAPHIC" && (
            <div className="mt-6">
              <p className="text-sm font-black">
                Responsive Media
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Upload separate
                mobile media for
                better storefront
                quality.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-zinc-200 p-5 text-center">
                  <input
                    type="file"
                    accept={
                      form.contentType ===
                      "VIDEO"
                        ? "video/*"
                        : "image/*"
                    }
                    onChange={(
                      event,
                    ) =>
                      uploadMedia(
                        event,
                        "DESKTOP",
                      )
                    }
                    className="hidden"
                  />

                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                    Desktop
                  </p>

                  <p className="mt-2 text-sm font-black">
                    {uploadingTarget ===
                    "DESKTOP"
                      ? "Uploading..."
                      : form.contentType ===
                          "VIDEO"
                        ? "Upload Desktop Video"
                        : "Upload Desktop Image"}
                  </p>

                  {(form.imageUrl ||
                    form.videoUrl) && (
                    <p className="mt-2 text-xs font-bold text-emerald-600">
                      Media ready ✓
                    </p>
                  )}
                </label>

                <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-zinc-200 p-5 text-center">
                  <input
                    type="file"
                    accept={
                      form.contentType ===
                      "VIDEO"
                        ? "video/*"
                        : "image/*"
                    }
                    onChange={(
                      event,
                    ) =>
                      uploadMedia(
                        event,
                        "MOBILE",
                      )
                    }
                    className="hidden"
                  />

                  <p className="text-xs font-black uppercase tracking-widest text-zinc-400">
                    Mobile
                  </p>

                  <p className="mt-2 text-sm font-black">
                    {uploadingTarget ===
                    "MOBILE"
                      ? "Uploading..."
                      : form.contentType ===
                          "VIDEO"
                        ? "Upload Mobile Video"
                        : "Upload Mobile Image"}
                  </p>

                  {(form.mobileImageUrl ||
                    form.mobileVideoUrl) && (
                    <p className="mt-2 text-xs font-bold text-emerald-600">
                      Media ready ✓
                    </p>
                  )}
                </label>
              </div>

              {(form.imageUrl ||
                form.videoUrl ||
                form.mobileImageUrl ||
                form.mobileVideoUrl) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(form.imageUrl ||
                    form.videoUrl) && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          imageUrl:
                            "",
                          videoUrl:
                            "",
                        })
                      }
                      className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold"
                    >
                      Remove Desktop
                    </button>
                  )}

                  {(form.mobileImageUrl ||
                    form.mobileVideoUrl) && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          mobileImageUrl:
                            "",
                          mobileVideoUrl:
                            "",
                        })
                      }
                      className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold"
                    >
                      Remove Mobile
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <p className="text-sm font-black">
              Copy & Action
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <input
                value={
                  form.title
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    title:
                      e.target
                        .value,
                  })
                }
                placeholder="Headline"
                className="rounded-xl border px-4 py-3 text-sm"
              />

              <input
                value={
                  form.subtitle
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    subtitle:
                      e.target
                        .value,
                  })
                }
                placeholder="Subtitle"
                className="rounded-xl border px-4 py-3 text-sm"
              />

              <input
                value={
                  form.buttonText
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    buttonText:
                      e.target
                        .value,
                  })
                }
                placeholder="CTA — Shop Now"
                className="rounded-xl border px-4 py-3 text-sm"
              />

              <input
                value={
                  form.buttonUrl
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    buttonUrl:
                      e.target
                        .value,
                  })
                }
                placeholder="CTA URL — /shop"
                className="rounded-xl border px-4 py-3 text-sm"
              />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-black">
              Design Controls
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-zinc-500">
                Background Color

                <div className="mt-2 flex gap-2">
                  <input
                    type="color"
                    value={
                      /^#[0-9A-Fa-f]{6}$/.test(
                        form.backgroundColor,
                      )
                        ? form.backgroundColor
                        : "#18181b"
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        backgroundColor:
                          e.target
                            .value,
                      })
                    }
                    className="h-12 w-14 rounded-xl border bg-white p-1"
                  />

                  <input
                    value={
                      form.backgroundColor
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        backgroundColor:
                          e.target
                            .value,
                      })
                    }
                    placeholder="#18181b"
                    className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm"
                  />
                </div>
              </label>

              <label className="text-xs font-bold text-zinc-500">
                Text Color

                <div className="mt-2 flex gap-2">
                  <input
                    type="color"
                    value={
                      /^#[0-9A-Fa-f]{6}$/.test(
                        form.textColor,
                      )
                        ? form.textColor
                        : "#ffffff"
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        textColor:
                          e.target
                            .value,
                      })
                    }
                    className="h-12 w-14 rounded-xl border bg-white p-1"
                  />

                  <input
                    value={
                      form.textColor
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        textColor:
                          e.target
                            .value,
                      })
                    }
                    placeholder="#ffffff"
                    className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm"
                  />
                </div>
              </label>

              <label className="text-xs font-bold text-zinc-500 sm:col-span-2">
                Background Gradient
                <span className="ml-1 font-normal text-zinc-400">
                  optional
                </span>

                <input
                  value={
                    form.backgroundGradient
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      backgroundGradient:
                        e.target
                          .value,
                    })
                  }
                  placeholder="linear-gradient(135deg, #18181b, #7c3aed)"
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm"
                />
              </label>

              <label className="text-xs font-bold text-zinc-500">
                Text Alignment

                <select
                  value={
                    form.textAlign
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      textAlign:
                        e.target
                          .value as BannerTextAlign,
                    })
                  }
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm font-bold text-zinc-900"
                >
                  <option value="LEFT">
                    Left
                  </option>
                  <option value="CENTER">
                    Center
                  </option>
                  <option value="RIGHT">
                    Right
                  </option>
                </select>
              </label>

              <label className="text-xs font-bold text-zinc-500">
                Overlay
                {" "}
                {form.overlayOpacity}%

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={
                    form.overlayOpacity
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      overlayOpacity:
                        e.target
                          .value,
                    })
                  }
                  className="mt-4 w-full"
                />
              </label>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black">
                Live Preview
              </p>

              <div className="flex rounded-xl bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() =>
                    setPreviewDevice(
                      "MOBILE",
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-[10px] font-black ${
                    previewDevice ===
                    "MOBILE"
                      ? "bg-white shadow-sm"
                      : "text-zinc-400"
                  }`}
                >
                  MOBILE
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPreviewDevice(
                      "DESKTOP",
                    )
                  }
                  className={`rounded-lg px-3 py-2 text-[10px] font-black ${
                    previewDevice ===
                    "DESKTOP"
                      ? "bg-white shadow-sm"
                      : "text-zinc-400"
                  }`}
                >
                  DESKTOP
                </button>
              </div>
            </div>

            <div
              className={`relative mt-4 overflow-hidden rounded-3xl ${
                previewDevice ===
                "MOBILE"
                  ? "mx-auto aspect-[4/5] max-w-sm"
                  : "aspect-[16/6] w-full"
              }`}
              style={{
                background:
                  previewBackground,
              }}
            >
              {form.contentType ===
                "IMAGE" &&
                previewImage && (
                  <img
                    src={
                      previewImage
                    }
                    alt="Promo preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

              {form.contentType ===
                "VIDEO" &&
                previewVideo && (
                  <video
                    src={
                      previewVideo
                    }
                    muted
                    autoPlay
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

              <div
                className="absolute inset-0 bg-black"
                style={{
                  opacity:
                    Number(
                      form.overlayOpacity,
                    ) / 100,
                }}
              />

              <div
                className={`absolute inset-0 z-10 flex flex-col justify-center p-6 ${previewAlignment}`}
                style={{
                  color:
                    form.textColor ||
                    "#ffffff",
                }}
              >
                <p className="text-[10px] font-black uppercase tracking-[0.22em] opacity-70">
                  {
                    placementLabels[
                      form
                        .placement
                    ]
                  }
                </p>

                <h3 className="mt-3 max-w-xl text-2xl font-black sm:text-4xl">
                  {form.title ||
                    "Your headline"}
                </h3>

                <p className="mt-2 max-w-lg text-sm opacity-80">
                  {form.subtitle ||
                    "Your promotional message appears here."}
                </p>

                {form.buttonText && (
                  <span className="mt-5 inline-flex w-fit rounded-xl bg-white px-4 py-3 text-xs font-black text-zinc-950">
                    {
                      form.buttonText
                    }
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-black">
              Publishing
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                value={
                  form.sortOrder
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    sortOrder:
                      e.target
                        .value,
                  })
                }
                placeholder="Sort order"
                className="rounded-xl border px-4 py-3 text-sm"
              />

              <label className="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={
                    form.isActive
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      isActive:
                        e.target
                          .checked,
                    })
                  }
                />

                Active
              </label>

              <label className="text-xs font-bold text-zinc-500">
                Starts At

                <input
                  type="datetime-local"
                  value={
                    form.startsAt
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      startsAt:
                        e.target
                          .value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm text-zinc-900"
                />
              </label>

              <label className="text-xs font-bold text-zinc-500">
                Expires At

                <input
                  type="datetime-local"
                  value={
                    form.expiresAt
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expiresAt:
                        e.target
                          .value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border px-4 py-3 text-sm text-zinc-900"
                />
              </label>
            </div>
          </div>

          <button
            disabled={
              saving ||
              uploadingTarget !==
                null
            }
            className="mt-6 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Promo Content"
                : "Create Promo Content"}
          </button>
        </form>

        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Published Library
              </p>

              <h2 className="mt-1 text-lg font-black">
                Existing Content
              </h2>
            </div>

            <span className="text-xs text-zinc-500">
              {
                filteredBanners.length
              }{" "}
              shown
            </span>
          </div>

          <select
            value={
              placementFilter
            }
            onChange={(e) =>
              setPlacementFilter(
                e.target
                  .value as
                  | "ALL"
                  | BannerPlacement,
              )
            }
            className="mt-4 w-full rounded-xl border bg-white px-4 py-3 text-sm font-bold"
          >
            <option value="ALL">
              All Placements
            </option>

            {Object.entries(
              placementLabels,
            ).map(
              ([
                value,
                label,
              ]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>

          {loading ? (
            <div className="mt-4 rounded-3xl bg-white p-8 text-center">
              Loading content...
            </div>
          ) : filteredBanners.length ===
            0 ? (
            <div className="mt-4 rounded-3xl bg-white p-8 text-center text-sm text-zinc-500">
              No promo content in
              this placement.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {filteredBanners.map(
                (banner) => {
                  const cardImage =
                    banner.mobileImageUrl ||
                    banner.imageUrl;

                  const cardVideo =
                    banner.mobileVideoUrl ||
                    banner.videoUrl;

                  const cardBackground =
                    banner.backgroundGradient ||
                    banner.backgroundColor ||
                    "#18181b";

                  return (
                    <article
                      key={
                        banner.id
                      }
                      className="overflow-hidden rounded-3xl bg-white shadow-sm"
                    >
                      <div
                        className="relative h-48"
                        style={{
                          background:
                            cardBackground,
                        }}
                      >
                        {banner.contentType ===
                          "VIDEO" &&
                        cardVideo ? (
                          <video
                            src={
                              cardVideo
                            }
                            muted
                            playsInline
                            controls
                            className="h-full w-full object-cover"
                          />
                        ) : banner.contentType ===
                            "IMAGE" &&
                          cardImage ? (
                          <img
                            src={
                              cardImage
                            }
                            alt={
                              banner.title ??
                              "Promo content"
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-full items-center justify-center p-6 text-center font-black"
                            style={{
                              color:
                                banner.textColor ||
                                "#ffffff",
                            }}
                          >
                            {banner.title ||
                              banner.subtitle ||
                              "Graphic Promo"}
                          </div>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-black">
                              {banner.title ||
                                "Untitled Promo"}
                            </h3>

                            {banner.subtitle && (
                              <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                                {
                                  banner.subtitle
                                }
                              </p>
                            )}
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${
                              banner.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-zinc-100 text-zinc-500"
                            }`}
                          >
                            {banner.isActive
                              ? "ACTIVE"
                              : "INACTIVE"}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-black">
                            {
                              placementLabels[
                                banner
                                  .placement
                              ]
                            }
                          </span>

                          <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">
                            {
                              typeLabels[
                                banner
                                  .contentType
                              ]
                            }
                          </span>

                          <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black text-violet-700">
                            {
                              audienceLabels[
                                banner
                                  .audience
                              ]
                            }
                          </span>
                        </div>

                        <p className="mt-3 text-xs text-zinc-400">
                          Priority / sort:
                          {" "}
                          {
                            banner.sortOrder
                          }
                        </p>

                        <div className="mt-5 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onPointerDown={(
                              event,
                            ) => {
                              event.preventDefault();

                              editBanner(
                                banner,
                              );
                            }}
                            className="touch-manipulation rounded-xl bg-zinc-100 py-3 text-xs font-black"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleBanner(
                                banner,
                              )
                            }
                            className="rounded-xl bg-amber-50 py-3 text-xs font-black text-amber-700"
                          >
                            {banner.isActive
                              ? "Disable"
                              : "Enable"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteBanner(
                                banner,
                              )
                            }
                            className="rounded-xl bg-red-50 py-3 text-xs font-black text-red-700"
                          >
                            Delete
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
