"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
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
  buttonText: string;
  buttonUrl: string;
  sortOrder: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  title: "",
  subtitle: "",
  imageUrl: "",
  videoUrl: "",
  buttonText: "",
  buttonUrl: "",
  sortOrder: "0",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

function dateInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60000,
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
    useState<FormState>(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  async function loadBanners() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/admin/banners",
        {
          cache: "no-store",
          credentials: "same-origin",
        },
      );

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to load banners.",
        );
      }

      setBanners(
        Array.isArray(data.banners)
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
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    try {
      setUploading(true);

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

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Upload failed.",
        );
      }

      if (data.type === "VIDEO") {
        setForm((current) => ({
          ...current,
          videoUrl: data.url,
          imageUrl: "",
        }));
      } else {
        setForm((current) => ({
          ...current,
          imageUrl: data.url,
          videoUrl: "",
        }));
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Upload failed.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function editBanner(
    banner: Banner,
  ) {
    setEditingId(banner.id);

    setForm({
      title: banner.title ?? "",
      subtitle:
        banner.subtitle ?? "",
      imageUrl:
        banner.imageUrl ?? "",
      videoUrl:
        banner.videoUrl ?? "",
      buttonText:
        banner.buttonText ?? "",
      buttonUrl:
        banner.buttonUrl ?? "",
      sortOrder: String(
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

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveBanner(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !form.imageUrl &&
      !form.videoUrl
    ) {
      alert(
        "Upload an image or video.",
      );
      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          "/api/admin/banners",
          {
            method: editingId
              ? "PATCH"
              : "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              ...(editingId
                ? {
                    id: editingId,
                  }
                : {}),
              ...form,
              sortOrder:
                Number(
                  form.sortOrder,
                ),
            }),
          },
        );

      const data =
        await response.json();

      if (response.status === 401) {
        router.replace(
          "/admin/login",
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to save banner.",
        );
      }

      resetForm();
      await loadBanners();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save banner.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleBanner(
    banner: Banner,
  ) {
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
          body: JSON.stringify({
            id: banner.id,
            isActive:
              !banner.isActive,
          }),
        },
      );

    const data =
      await response.json();

    if (!response.ok) {
      alert(
        data.error ??
          "Update failed.",
      );
      return;
    }

    await loadBanners();
  }

  async function deleteBanner(
    banner: Banner,
  ) {
    if (
      !confirm(
        `Delete banner ${
          banner.title ??
          "without title"
        }?`,
      )
    ) {
      return;
    }

    const response =
      await fetch(
        "/api/admin/banners",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          credentials:
            "same-origin",
          body: JSON.stringify({
            id: banner.id,
          }),
        },
      );

    const data =
      await response.json();

    if (!response.ok) {
      alert(
        data.error ??
          "Delete failed.",
      );
      return;
    }

    await loadBanners();
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-zinc-900">
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <button
            onClick={() =>
              router.push("/admin")
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
              Banners
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <form
          onSubmit={saveBanner}
          className="rounded-3xl bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">
              {editingId
                ? "Edit Banner"
                : "Create Banner"}
            </h2>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-zinc-500"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <label className="mt-5 block rounded-2xl border-2 border-dashed border-zinc-200 p-5 text-center">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={uploadMedia}
              className="hidden"
            />

            <p className="text-sm font-black">
              {uploading
                ? "Uploading..."
                : "Upload Banner Image / Video"}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              Image max 10MB · Video max 50MB
            </p>
          </label>

          {(form.imageUrl ||
            form.videoUrl) && (
            <div className="mt-4 overflow-hidden rounded-2xl bg-zinc-950">
              {form.videoUrl ? (
                <video
                  src={form.videoUrl}
                  controls
                  className="h-52 w-full object-cover"
                />
              ) : (
                <img
                  src={form.imageUrl}
                  alt="Banner preview"
                  className="h-52 w-full object-cover"
                />
              )}
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  title:
                    e.target.value,
                })
              }
              placeholder="Banner title"
              className="rounded-xl border px-4 py-3 text-sm"
            />

            <input
              value={form.subtitle}
              onChange={(e) =>
                setForm({
                  ...form,
                  subtitle:
                    e.target.value,
                })
              }
              placeholder="Subtitle"
              className="rounded-xl border px-4 py-3 text-sm"
            />

            <input
              value={form.buttonText}
              onChange={(e) =>
                setForm({
                  ...form,
                  buttonText:
                    e.target.value,
                })
              }
              placeholder="Button text"
              className="rounded-xl border px-4 py-3 text-sm"
            />

            <input
              value={form.buttonUrl}
              onChange={(e) =>
                setForm({
                  ...form,
                  buttonUrl:
                    e.target.value,
                })
              }
              placeholder="Button URL e.g. /shop"
              className="rounded-xl border px-4 py-3 text-sm"
            />

            <input
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({
                  ...form,
                  sortOrder:
                    e.target.value,
                })
              }
              placeholder="Sort order"
              className="rounded-xl border px-4 py-3 text-sm"
            />

            <label className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold">
              <input
                type="checkbox"
                checked={
                  form.isActive
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    isActive:
                      e.target.checked,
                  })
                }
              />
              Active
            </label>

            <label className="text-xs font-bold text-zinc-500">
              Starts At
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) =>
                  setForm({
                    ...form,
                    startsAt:
                      e.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl border px-4 py-3 text-sm text-zinc-900"
              />
            </label>

            <label className="text-xs font-bold text-zinc-500">
              Expires At
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm({
                    ...form,
                    expiresAt:
                      e.target.value,
                  })
                }
                className="mt-2 w-full rounded-xl border px-4 py-3 text-sm text-zinc-900"
              />
            </label>
          </div>

          <button
            disabled={
              saving || uploading
            }
            className="mt-6 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Banner"
                : "Create Banner"}
          </button>
        </form>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">
              Existing Banners
            </h2>

            <span className="text-xs text-zinc-500">
              {banners.length} total
            </span>
          </div>

          {loading ? (
            <div className="mt-4 rounded-3xl bg-white p-8 text-center">
              Loading banners...
            </div>
          ) : banners.length === 0 ? (
            <div className="mt-4 rounded-3xl bg-white p-8 text-center text-sm text-zinc-500">
              No banners created yet.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {banners.map(
                (banner) => (
                  <article
                    key={banner.id}
                    className="overflow-hidden rounded-3xl bg-white shadow-sm"
                  >
                    {banner.videoUrl ? (
                      <video
                        src={
                          banner.videoUrl
                        }
                        muted
                        controls
                        className="h-48 w-full object-cover"
                      />
                    ) : banner.imageUrl ? (
                      <img
                        src={
                          banner.imageUrl
                        }
                        alt={
                          banner.title ??
                          "Banner"
                        }
                        className="h-48 w-full object-cover"
                      />
                    ) : null}

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black">
                            {banner.title ||
                              "Untitled Banner"}
                          </h3>

                          {banner.subtitle && (
                            <p className="mt-1 text-xs text-zinc-500">
                              {
                                banner.subtitle
                              }
                            </p>
                          )}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black ${
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

                      <p className="mt-3 text-xs text-zinc-400">
                        Sort order:{" "}
                        {
                          banner.sortOrder
                        }
                      </p>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            editBanner(
                              banner,
                            )
                          }
                          className="rounded-xl bg-zinc-100 py-3 text-xs font-black"
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
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
