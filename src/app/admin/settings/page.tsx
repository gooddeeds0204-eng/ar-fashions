"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

type Settings = {
  storeName: string;
  supportPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  storeNotice: string;

  codEnabled: boolean;
  minimumRetailOrder: number;

  maintenanceMode: boolean;
  maintenanceMessage: string;
};

type SalesMode = {
  retailStatus:
    | "OPEN"
    | "CLOSED";

  resellerStatus:
    | "OPEN"
    | "CLOSED";

  retailMessage: string;
  resellerMessage: string;
};

const defaultSettings:
  Settings = {
    storeName:
      "AS FASHIONS",

    supportPhone: "",
    whatsappNumber: "",
    supportEmail: "",
    storeNotice: "",

    codEnabled: true,

    minimumRetailOrder:
      0,

    maintenanceMode:
      false,

    maintenanceMessage:
      "We are currently updating the store. Please check back shortly.",
  };

const defaultSalesMode:
  SalesMode = {
    retailStatus: "OPEN",
    resellerStatus: "OPEN",

    retailMessage:
      "Retail shopping is open.",

    resellerMessage:
      "Reseller orders are open.",
  };

export default function SettingsPage() {
  const router =
    useRouter();

  const [
    settings,
    setSettings,
  ] =
    useState<Settings>(
      defaultSettings,
    );

  const [
    salesMode,
    setSalesMode,
  ] =
    useState<SalesMode>(
      defaultSalesMode,
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
    message,
    setMessage,
  ] =
    useState("");

  const [
    deletePinConfigured,
    setDeletePinConfigured,
  ] = useState(false);

  const [
    currentDeletePin,
    setCurrentDeletePin,
  ] = useState("");

  const [
    newDeletePin,
    setNewDeletePin,
  ] = useState("");

  const [
    savingDeletePin,
    setSavingDeletePin,
  ] = useState(false);

  async function loadSettings() {
    try {
      setLoading(true);
      setMessage("");

      const response =
        await fetch(
          "/api/admin/site-settings",
          {
            cache:
              "no-store",

            credentials:
              "same-origin",
          },
        );

      if (
        response.status ===
        401
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
            "Failed to load settings.",
        );
      }

      setSettings({
        ...defaultSettings,
        ...data.settings,
      });

      setSalesMode({
        ...defaultSalesMode,
        ...data.salesMode,
      });

      const pinResponse =
        await fetch(
          "/api/admin/product-delete-pin",
          {
            cache: "no-store",
            credentials:
              "same-origin",
          },
        );

      if (pinResponse.ok) {
        const pinData =
          await pinResponse.json();

        setDeletePinConfigured(
          pinData.configured ===
            true,
        );
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load settings.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function save() {
    try {
      setSaving(true);
      setMessage("");

      const response =
        await fetch(
          "/api/admin/site-settings",
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            body:
              JSON.stringify({
                settings,
                salesMode,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Save failed.",
        );
      }

      setSettings(
        data.settings,
      );

      setSalesMode(
        data.salesMode,
      );

      setMessage(
        data.message,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Save failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDeletePin() {
    if (
      !/^\d{4,8}$/.test(
        newDeletePin,
      )
    ) {
      setMessage(
        "Delete PIN must be 4 to 8 digits.",
      );
      return;
    }

    try {
      setSavingDeletePin(true);
      setMessage("");

      const response =
        await fetch(
          "/api/admin/product-delete-pin",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body:
              JSON.stringify({
                pin:
                  newDeletePin,
                currentPin:
                  currentDeletePin,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Delete PIN save failed.",
        );
      }

      setDeletePinConfigured(
        true,
      );
      setCurrentDeletePin("");
      setNewDeletePin("");
      setMessage(
        data.message ??
          "Delete PIN saved successfully.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Delete PIN save failed.",
      );
    } finally {
      setSavingDeletePin(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF7F0] p-8">
        Loading settings...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 py-6 text-[#211C18] md:px-8">
      <div className="mx-auto max-w-6xl">

        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
          AS FASHIONS
        </p>

        <h1 className="mt-1 text-3xl font-black">
          Site Settings
        </h1>

        <p className="mt-1 text-sm text-zinc-500">
          Store details, shopping modes and checkout controls.
        </p>

        {message ? (
          <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">

          <section className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
            <p className="text-xs font-black uppercase text-emerald-600">
              Store Information
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-black">
                Store Name

                <input
                  value={
                    settings.storeName
                  }
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      storeName:
                        event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-2xl border p-3"
                />
              </label>

              <label className="text-xs font-black">
                Support Phone

                <input
                  value={
                    settings.supportPhone
                  }
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      supportPhone:
                        event.target.value,
                    })
                  }
                  placeholder="Customer support number"
                  className="mt-2 w-full rounded-2xl border p-3"
                />
              </label>

              <label className="text-xs font-black">
                WhatsApp Number

                <input
                  value={
                    settings.whatsappNumber
                  }
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      whatsappNumber:
                        event.target.value,
                    })
                  }
                  placeholder="WhatsApp support"
                  className="mt-2 w-full rounded-2xl border p-3"
                />
              </label>

              <label className="text-xs font-black">
                Support Email

                <input
                  type="email"
                  value={
                    settings.supportEmail
                  }
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      supportEmail:
                        event.target.value,
                    })
                  }
                  placeholder="support@example.com"
                  className="mt-2 w-full rounded-2xl border p-3"
                />
              </label>
            </div>

            <label className="mt-4 block text-xs font-black">
              Store Notice

              <textarea
                rows={3}
                value={
                  settings.storeNotice
                }
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    storeNotice:
                      event.target.value,
                  })
                }
                placeholder="Optional announcement shown to customers"
                className="mt-2 w-full rounded-2xl border p-4"
              />
            </label>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase text-blue-600">
              Retail Store
            </p>

            <h2 className="mt-1 text-xl font-black">
              Retail Shopping
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                "OPEN",
                "CLOSED",
              ].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    const nextStatus =
                      value as
                        | "OPEN"
                        | "CLOSED";

                    let nextMessage =
                      salesMode.retailMessage;

                    if (
                      nextStatus === "CLOSED" &&
                      nextMessage.trim() ===
                        "Retail shopping is open."
                    ) {
                      nextMessage =
                        "Retail orders are temporarily closed.";
                    }

                    if (
                      nextStatus === "OPEN" &&
                      nextMessage.trim() ===
                        "Retail orders are temporarily closed."
                    ) {
                      nextMessage =
                        "Retail shopping is open.";
                    }

                    setSalesMode({
                      ...salesMode,
                      retailStatus:
                        nextStatus,
                      retailMessage:
                        nextMessage,
                    });
                  }}
                  className={`rounded-xl px-4 py-3 text-xs font-black ${
                    salesMode.retailStatus ===
                    value
                      ? value ===
                        "OPEN"
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-xs font-black">
              Retail Message

              <textarea
                rows={3}
                value={
                  salesMode.retailMessage
                }
                onChange={(event) =>
                  setSalesMode({
                    ...salesMode,

                    retailMessage:
                      event.target.value,
                  })
                }
                className="mt-2 w-full rounded-2xl border p-4"
              />
            </label>

            <label className="mt-4 block text-xs font-black">
              Minimum Retail Order ₹

              <input
                type="number"
                min="0"
                value={
                  settings.minimumRetailOrder
                }
                onChange={(event) =>
                  setSettings({
                    ...settings,

                    minimumRetailOrder:
                      Number(
                        event.target.value,
                      ),
                  })
                }
                className="mt-2 w-full rounded-2xl border p-3"
              />
            </label>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase text-violet-600">
              Reseller
            </p>

            <h2 className="mt-1 text-xl font-black">
              Bulk / Reseller Orders
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                "OPEN",
                "CLOSED",
              ].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    const nextStatus =
                      value as
                        | "OPEN"
                        | "CLOSED";

                    let nextMessage =
                      salesMode.resellerMessage;

                    if (
                      nextStatus === "CLOSED" &&
                      nextMessage.trim() ===
                        "Reseller orders are open."
                    ) {
                      nextMessage =
                        "Reseller orders are temporarily closed.";
                    }

                    if (
                      nextStatus === "OPEN" &&
                      nextMessage.trim() ===
                        "Reseller orders are temporarily closed."
                    ) {
                      nextMessage =
                        "Reseller orders are open.";
                    }

                    setSalesMode({
                      ...salesMode,
                      resellerStatus:
                        nextStatus,
                      resellerMessage:
                        nextMessage,
                    });
                  }}
                  className={`rounded-xl px-4 py-3 text-xs font-black ${
                    salesMode.resellerStatus ===
                    value
                      ? value ===
                        "OPEN"
                        ? "bg-emerald-600 text-white"
                        : "bg-red-600 text-white"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-xs font-black">
              Reseller Message

              <textarea
                rows={3}
                value={
                  salesMode.resellerMessage
                }
                onChange={(event) =>
                  setSalesMode({
                    ...salesMode,

                    resellerMessage:
                      event.target.value,
                  })
                }
                className="mt-2 w-full rounded-2xl border p-4"
              />
            </label>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase text-amber-600">
              Checkout
            </p>

            <label className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 p-4">
              <div>
                <p className="text-sm font-black">
                  Cash on Delivery
                </p>

                <p className="mt-1 text-[11px] text-zinc-500">
                  Allow customers to place COD orders.
                </p>
              </div>

              <input
                type="checkbox"
                checked={
                  settings.codEnabled
                }
                onChange={(event) =>
                  setSettings({
                    ...settings,

                    codEnabled:
                      event.target.checked,
                  })
                }
                className="h-5 w-5"
              />
            </label>
          </section>

          <section className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase text-red-600">
              Product Delete Security
            </p>

            <h2 className="mt-1 text-xl font-black">
              Delete PIN
            </h2>

            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Product delete cheyyadaniki ee PIN compulsory.
              PIN server-side secure hash ga save avutundi.
            </p>

            <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
              <p className="text-xs font-black">
                Status:{" "}
                <span
                  className={
                    deletePinConfigured
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }
                >
                  {deletePinConfigured
                    ? "PIN SET"
                    : "PIN NOT SET"}
                </span>
              </p>
            </div>

            {deletePinConfigured && (
              <label className="mt-4 block text-xs font-black">
                Current PIN

                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={
                    currentDeletePin
                  }
                  onChange={(event) =>
                    setCurrentDeletePin(
                      event.target.value.replace(
                        /\D/g,
                        "",
                      ),
                    )
                  }
                  placeholder="Enter current PIN"
                  className="mt-2 w-full rounded-2xl border p-3"
                />
              </label>
            )}

            <label className="mt-4 block text-xs font-black">
              {deletePinConfigured
                ? "New PIN"
                : "Create Delete PIN"}

              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={newDeletePin}
                onChange={(event) =>
                  setNewDeletePin(
                    event.target.value.replace(
                      /\D/g,
                      "",
                    ),
                  )
                }
                placeholder="4 to 8 digits"
                className="mt-2 w-full rounded-2xl border p-3"
              />
            </label>

            <button
              type="button"
              onClick={
                saveDeletePin
              }
              disabled={
                savingDeletePin
              }
              className="mt-4 w-full rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {savingDeletePin
                ? "Saving PIN..."
                : deletePinConfigured
                  ? "Change Delete PIN"
                  : "Set Delete PIN"}
            </button>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase text-red-600">
              Maintenance
            </p>

            <label className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 p-4">
              <div>
                <p className="text-sm font-black">
                  Maintenance Mode
                </p>

                <p className="mt-1 text-[11px] text-zinc-500">
                  Temporarily show a maintenance notice.
                </p>
              </div>

              <input
                type="checkbox"
                checked={
                  settings.maintenanceMode
                }
                onChange={(event) =>
                  setSettings({
                    ...settings,

                    maintenanceMode:
                      event.target.checked,
                  })
                }
                className="h-5 w-5"
              />
            </label>

            <textarea
              rows={4}
              value={
                settings.maintenanceMessage
              }
              onChange={(event) =>
                setSettings({
                  ...settings,

                  maintenanceMessage:
                    event.target.value,
                })
              }
              className="mt-4 w-full rounded-2xl border p-4 text-sm"
            />
          </section>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-6 rounded-2xl bg-zinc-950 px-6 py-4 text-sm font-black text-white disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Site Settings"}
        </button>
      </div>
    </main>
  );
}
