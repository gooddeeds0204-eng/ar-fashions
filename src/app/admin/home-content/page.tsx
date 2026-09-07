"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type SectionType =
  | "NEW_ARRIVALS"
  | "TRENDING"
  | "REELS"
  | "FEATURED";

type HomeSection = {
  id: string;
  title: string;
  subtitle: string;
  sectionType: SectionType;
  isActive: boolean;
  sortOrder: number;
};

type FormState = {
  title: string;
  subtitle: string;
  sectionType: SectionType;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  title: "",
  subtitle: "",
  sectionType: "NEW_ARRIVALS",
  sortOrder: "0",
  isActive: true,
};

const sectionTypes: Array<{
  value: SectionType;
  label: string;
}> = [
  {
    value: "NEW_ARRIVALS",
    label: "New Arrivals",
  },
  {
    value: "TRENDING",
    label: "Trending",
  },
  {
    value: "REELS",
    label: "Fashion Reels",
  },
  {
    value: "FEATURED",
    label: "Featured",
  },
];

export default function AdminHomeContentPage() {
  const router = useRouter();

  const [
    sections,
    setSections,
  ] = useState<HomeSection[]>([]);

  const [
    form,
    setForm,
  ] = useState<FormState>(
    emptyForm,
  );

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  async function loadSections() {
    try {
      setLoading(true);

      const response =
        await fetch(
          "/api/admin/home-sections",
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
            "Failed to load home sections.",
        );
      }

      setSections(
        Array.isArray(
          data.sections,
        )
          ? data.sections
          : [],
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load home sections.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSections();
  }, []);

  function resetForm() {
    setEditingId(null);

    setForm(
      emptyForm,
    );
  }

  function editSection(
    section: HomeSection,
  ) {
    setEditingId(
      section.id,
    );

    setForm({
      title:
        section.title,
      subtitle:
        section.subtitle,
      sectionType:
        section.sectionType,
      sortOrder:
        String(
          section.sortOrder,
        ),
      isActive:
        section.isActive,
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function saveSection(
    event: FormEvent,
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      const response =
        await fetch(
          "/api/admin/home-sections",
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
              title:
                form.title,
              subtitle:
                form.subtitle,
              sectionType:
                form.sectionType,
              sortOrder:
                Number(
                  form.sortOrder,
                ),
              isActive:
                form.isActive,
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
            "Failed to save section.",
        );
      }

      resetForm();

      await loadSections();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save section.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSection(
    section: HomeSection,
  ) {
    try {
      const response =
        await fetch(
          "/api/admin/home-sections",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              id:
                section.id,
              isActive:
                !section.isActive,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to update section.",
        );
      }

      await loadSections();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update section.",
      );
    }
  }

  async function deleteSection(
    section: HomeSection,
  ) {
    if (
      !confirm(
        `Delete "${section.title}"?`,
      )
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          "/api/admin/home-sections",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              id:
                section.id,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Failed to delete section.",
        );
      }

      await loadSections();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete section.",
      );
    }
  }

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
              Home Content
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <form
          onSubmit={
            saveSection
          }
          className="rounded-3xl bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">
                {editingId
                  ? "Edit Section"
                  : "Create Section"}
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Control homepage product sections.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={
                  resetForm
                }
                className="text-xs font-bold text-zinc-500"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <select
              value={
                form.sectionType
              }
              onChange={(event) => {
                const type =
                  event.target
                    .value as SectionType;

                const preset =
                  sectionTypes.find(
                    (item) =>
                      item.value ===
                      type,
                  );

                setForm({
                  ...form,
                  sectionType:
                    type,
                  title:
                    form.title ||
                    preset?.label ||
                    "",
                });
              }}
              className="rounded-xl border px-4 py-3 text-sm font-bold"
            >
              {sectionTypes.map(
                (type) => (
                  <option
                    key={
                      type.value
                    }
                    value={
                      type.value
                    }
                  >
                    {
                      type.label
                    }
                  </option>
                ),
              )}
            </select>

            <input
              type="number"
              min="0"
              value={
                form.sortOrder
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  sortOrder:
                    event.target
                      .value,
                })
              }
              placeholder="Sort order"
              className="rounded-xl border px-4 py-3 text-sm"
            />

            <input
              required
              value={
                form.title
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  title:
                    event.target
                      .value,
                })
              }
              placeholder="Section title"
              className="rounded-xl border px-4 py-3 text-sm font-bold"
            />

            <input
              value={
                form.subtitle
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  subtitle:
                    event.target
                      .value,
                })
              }
              placeholder="Subtitle"
              className="rounded-xl border px-4 py-3 text-sm"
            />
          </div>

          <label className="mt-5 flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={
                form.isActive
              }
              onChange={(event) =>
                setForm({
                  ...form,
                  isActive:
                    event.target
                      .checked,
                })
              }
            />

            Active on Homepage
          </label>

          <button
            disabled={saving}
            className="mt-6 w-full rounded-2xl bg-zinc-950 py-4 text-sm font-black text-white disabled:bg-zinc-300"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Section"
                : "Create Section"}
          </button>
        </form>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">
              Homepage Sections
            </h2>

            <span className="text-xs text-zinc-500">
              {
                sections.length
              }{" "}
              total
            </span>
          </div>

          {loading ? (
            <div className="mt-4 rounded-3xl bg-white p-8 text-center">
              Loading sections...
            </div>
          ) : sections.length ===
            0 ? (
            <div className="mt-4 rounded-3xl bg-white p-8 text-center">
              <p className="text-sm font-bold">
                No custom sections yet.
              </p>

              <p className="mt-2 text-xs text-zinc-500">
                Homepage currently uses its default section layout.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {sections.map(
                (section) => (
                  <article
                    key={
                      section.id
                    }
                    className="rounded-3xl bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
                          {
                            section.sectionType
                          }
                        </p>

                        <h3 className="mt-1 text-lg font-black">
                          {
                            section.title
                          }
                        </h3>

                        {section.subtitle && (
                          <p className="mt-1 text-xs text-zinc-500">
                            {
                              section.subtitle
                            }
                          </p>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black ${
                          section.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {section.isActive
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>
                    </div>

                    <p className="mt-4 text-xs text-zinc-400">
                      Sort order:{" "}
                      {
                        section.sortOrder
                      }
                    </p>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          editSection(
                            section,
                          )
                        }
                        className="rounded-xl bg-zinc-100 py-3 text-xs font-black"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleSection(
                            section,
                          )
                        }
                        className="rounded-xl bg-amber-50 py-3 text-xs font-black text-amber-700"
                      >
                        {section.isActive
                          ? "Disable"
                          : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteSection(
                            section,
                          )
                        }
                        className="rounded-xl bg-red-50 py-3 text-xs font-black text-red-700"
                      >
                        Delete
                      </button>
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
