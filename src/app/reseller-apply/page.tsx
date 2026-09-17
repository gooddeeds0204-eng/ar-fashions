"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

type ExistingApplication = {
  businessName?: string;
  businessPhone?: string;
  gstNumber?: string | null;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  visitingCardUrl?: string | null;
  shopPhotoUrls?: string[];
  status?: string;
};

export default function ResellerApplyPage() {
  const router = useRouter();

  const [businessName, setBusinessName] =
    useState("");
  const [businessPhone, setBusinessPhone] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [gstNumber, setGstNumber] =
    useState("");
  const [addressLine, setAddressLine] =
    useState("");
  const [city, setCity] =
    useState("");
  const [state, setState] =
    useState("");
  const [pincode, setPincode] =
    useState("");
  const [latitude, setLatitude] =
    useState<number | null>(null);

  const [longitude, setLongitude] =
    useState<number | null>(null);

  const [
    locationAccuracy,
    setLocationAccuracy,
  ] = useState<number | null>(
    null,
  );

  const [
    locationStatus,
    setLocationStatus,
  ] = useState<
    "IDLE" |
    "LOADING" |
    "SUCCESS" |
    "ERROR"
  >("IDLE");

  const [
    visitingCardUrl,
    setVisitingCardUrl,
  ] = useState("");

  const [
    shopPhotoUrls,
    setShopPhotoUrls,
  ] = useState<string[]>([]);

  const [
    uploadingDocument,
    setUploadingDocument,
  ] = useState<
    "" | "CARD" | "SHOP"
  >("");

  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        const [
          profileResponse,
          applicationResponse,
        ] = await Promise.all([
          fetch("/api/profile", {
            cache: "no-store",
            credentials:
              "same-origin",
          }),
          fetch(
            "/api/reseller-application",
            {
              cache: "no-store",
              credentials:
                "same-origin",
            },
          ),
        ]);

        if (
          profileResponse.status === 401 ||
          applicationResponse.status ===
            401
        ) {
          router.replace("/login");
          return;
        }

        const profileData =
          await profileResponse.json();

        const applicationData =
          await applicationResponse.json();

        if (
          applicationData.isReseller ===
          true
        ) {
          router.replace(
            "/reseller-sets",
          );
          return;
        }

        const application:
          | ExistingApplication
          | null =
          applicationData.application ??
          null;

        if (
          application?.status ===
          "PENDING"
        ) {
          router.replace(
            "/reseller-status",
          );
          return;
        }

        setEmail(
          profileData.user?.email ?? "",
        );

        if (application) {
          setBusinessName(
            application.businessName ??
              "",
          );
          setBusinessPhone(
            application.businessPhone ??
              "",
          );
          setGstNumber(
            application.gstNumber ?? "",
          );
          setAddressLine(
            application.addressLine ??
              "",
          );
          setCity(
            application.city ?? "",
          );
          setState(
            application.state ?? "",
          );
          setPincode(
            application.pincode ?? "",
          );
          if (
            typeof application.latitude ===
              "number" &&
            typeof application.longitude ===
              "number"
          ) {
            setLatitude(
              application.latitude,
            );
            setLongitude(
              application.longitude,
            );
            setLocationAccuracy(
              application.locationAccuracy ??
                null,
            );
            setLocationStatus(
              "SUCCESS",
            );
          }

          setVisitingCardUrl(
            application.visitingCardUrl ??
              "",
          );

          setShopPhotoUrls(
            Array.isArray(
              application.shopPhotoUrls,
            )
              ? application.shopPhotoUrls
              : [],
          );
        }
      } catch {
        setError(
          "Unable to load reseller application.",
        );
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  async function uploadVerificationImage(
    file: File,
    kind:
      | "VISITING_CARD"
      | "SHOP_PHOTO",
  ) {
    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      throw new Error(
        "JPG, PNG లేదా WebP image మాత్రమే upload చేయండి.",
      );
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      throw new Error(
        "Image 5MB కంటే తక్కువ ఉండాలి.",
      );
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
    );

    formData.append(
      "kind",
      kind,
    );

    const response =
      await fetch(
        "/api/reseller-upload",
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
          "Image upload failed.",
      );
    }

    return String(
      data.url ?? "",
    );
  }

  async function uploadVisitingCard(
    file: File,
  ) {
    try {
      setError("");
      setUploadingDocument(
        "CARD",
      );

      const url =
        await uploadVerificationImage(
          file,
          "VISITING_CARD",
        );

      setVisitingCardUrl(
        url,
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Visiting card upload failed.",
      );
    } finally {
      setUploadingDocument("");
    }
  }

  async function uploadShopPhotos(
    files: FileList,
  ) {
    try {
      setError("");

      const available =
        3 -
        shopPhotoUrls.length;

      const selected =
        Array.from(files).slice(
          0,
          available,
        );

      if (
        selected.length === 0
      ) {
        return;
      }

      setUploadingDocument(
        "SHOP",
      );

      const urls: string[] =
        [];

      for (
        const file of selected
      ) {
        urls.push(
          await uploadVerificationImage(
            file,
            "SHOP_PHOTO",
          ),
        );
      }

      setShopPhotoUrls(
        (current) =>
          [
            ...current,
            ...urls,
          ].slice(0, 3),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Shop photo upload failed.",
      );
    } finally {
      setUploadingDocument("");
    }
  }

  function captureLiveLocation() {
    setError("");

    if (
      typeof navigator ===
        "undefined" ||
      !navigator.geolocation
    ) {
      setLocationStatus(
        "ERROR",
      );
      setError(
        "Location is not supported on this device.",
      );
      return;
    }

    setLocationStatus(
      "LOADING",
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentLatitude =
          position.coords.latitude;

        const currentLongitude =
          position.coords.longitude;

        setLatitude(
          currentLatitude,
        );

        setLongitude(
          currentLongitude,
        );

        setLocationAccuracy(
          position.coords.accuracy ??
            null,
        );

        try {
          const response =
            await fetch(
              "/api/reverse-geocode",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                credentials:
                  "same-origin",
                body:
                  JSON.stringify({
                    latitude:
                      currentLatitude,
                    longitude:
                      currentLongitude,
                  }),
              },
            );

          const data =
            await response.json();

          if (response.ok) {
            if (
              data.addressLine
            ) {
              setAddressLine(
                data.addressLine,
              );
            }

            if (data.city) {
              setCity(
                data.city,
              );
            }

            if (data.state) {
              setState(
                data.state,
              );
            }

            if (data.pincode) {
              setPincode(
                data.pincode,
              );
            }
          } else {
            setError(
              "Location captured. Address automaticగా detect కాలేదు; address manually edit చేయవచ్చు.",
            );
          }
        } catch {
          setError(
            "Location captured. Address automaticగా detect కాలేదు; address manually edit చేయవచ్చు.",
          );
        }

        setLocationStatus(
          "SUCCESS",
        );
      },

      () => {
        setLocationStatus(
          "ERROR",
        );

        setError(
          "Location permission allow చేసి, shop location వద్ద మళ్లీ try చేయండి.",
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  }

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError("");

    try {
      setSaving(true);

      const response =
        await fetch(
          "/api/reseller-application",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              email,
              businessName,
              businessPhone,
              gstNumber,
              addressLine,
              city,
              state,
              pincode,
              latitude,
              longitude,
              locationAccuracy,
              visitingCardUrl,
              shopPhotoUrls,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to submit application.",
        );
      }

      router.replace(
        "/reseller-status",
      );
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to submit application.",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-[1rem] border border-white/10 bg-white/[0.06] px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#D4AF37]/60";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b0a] text-white">
        <p className="text-sm text-white/45">
          Preparing reseller application...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080b0a] px-4 py-6 text-white">
      <div className="mx-auto max-w-xl">
        <header className="flex items-center justify-between">
          <BrandLogo
            light
            compact
            onClick={() =>
              router.push("/")
            }
          />

          <button
            type="button"
            onClick={() =>
              router.push("/account")
            }
            className="rounded-full border border-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-white/60"
          >
            My Account
          </button>
        </header>

        <section className="py-9">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">
            AR Fashions Wholesale
          </p>

          <h1 className="mt-4 font-serif text-4xl leading-[0.95] sm:text-5xl">
            Become an
            <br />
            AR reseller.
          </h1>

          <p className="mt-4 max-w-md text-sm leading-6 text-white/45">
            Submit your shop or business
            details. Wholesale access is
            enabled after AR approval.
          </p>

          <form
            onSubmit={submit}
            className="mt-7 space-y-4 rounded-[1.7rem] border border-white/[0.08] bg-white/[0.035] p-5"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              placeholder="Business email *"
              className={inputClass}
            />

            <input
              required
              value={businessName}
              onChange={(event) =>
                setBusinessName(
                  event.target.value,
                )
              }
              placeholder="Business / Shop name *"
              className={inputClass}
            />

            <input
              required
              value={businessPhone}
              onChange={(event) =>
                setBusinessPhone(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10),
                )
              }
              inputMode="numeric"
              placeholder="Business / WhatsApp number *"
              className={inputClass}
            />

            <input
              value={gstNumber}
              onChange={(event) =>
                setGstNumber(
                  event.target.value
                    .toUpperCase()
                    .replace(
                      /[^0-9A-Z]/g,
                      "",
                    )
                    .slice(0, 15),
                )
              }
              placeholder="GSTIN (optional)"
              className={inputClass}
            />

            <textarea
              required
              rows={3}
              value={addressLine}
              onChange={(event) =>
                setAddressLine(
                  event.target.value,
                )
              }
              placeholder="Full shop / business address *"
              className={`${inputClass} resize-none`}
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                required
                value={city}
                onChange={(event) =>
                  setCity(
                    event.target.value,
                  )
                }
                placeholder="City *"
                className={inputClass}
              />

              <input
                required
                value={state}
                onChange={(event) =>
                  setState(
                    event.target.value,
                  )
                }
                placeholder="State *"
                className={inputClass}
              />
            </div>

            <input
              required
              value={pincode}
              onChange={(event) =>
                setPincode(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6),
                )
              }
              inputMode="numeric"
              placeholder="Business pincode *"
              className={inputClass}
            />

            <div className="rounded-[1.2rem] border border-[#D4AF37]/25 bg-[#D4AF37]/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">
                    Live Shop Location *
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-white/35">
                    Current location capture చేస్తే address, city, state, pincode automaticగా fill అవుతాయి.
                  </p>
                </div>

                {locationStatus ===
                "SUCCESS" ? (
                  <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-[8px] font-black text-black">
                    CAPTURED
                  </span>
                ) : null}
              </div>

              {latitude !== null &&
              longitude !== null ? (
                <div className="mt-4 overflow-hidden rounded-[1rem] border border-white/10 bg-black">
                  <iframe
                    title="Shop live location"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.004}%2C${latitude - 0.004}%2C${longitude + 0.004}%2C${latitude + 0.004}&layer=mapnik&marker=${latitude}%2C${longitude}`}
                    className="h-52 w-full border-0"
                    loading="lazy"
                  />

                  <div className="border-t border-white/10 px-3 py-2.5">
                    <p className="text-[8px] font-semibold text-white/45">
                      Location captured
                      {locationAccuracy !==
                      null
                        ? ` · Accuracy ~${Math.round(
                            locationAccuracy,
                          )}m`
                        : ""}
                    </p>
                  </div>
                </div>
              ) : null}

              {locationStatus ===
              "LOADING" ? (
                <div className="mt-3 rounded-xl bg-white/[0.04] p-3 text-[9px] text-white/55">
                  📍 Getting live location...
                </div>
              ) : null}

              <button
                type="button"
                onClick={
                  captureLiveLocation
                }
                disabled={
                  locationStatus ===
                  "LOADING"
                }
                className="mt-3 w-full rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 py-3 text-[9px] font-black uppercase tracking-wider text-[#D4AF37] disabled:opacity-40"
              >
                {locationStatus ===
                "SUCCESS"
                  ? "↻ Update Live Location"
                  : "◎ Use Current Shop Location"}
              </button>
            </div>

            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">
                Verification Photos
              </p>

              <p className="mt-1 text-[9px] leading-4 text-white/35">
                Visiting card + actual shop photos upload చేయండి.
              </p>

              {/* VISITING CARD */}
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-white/70">
                    Visiting Card *
                  </p>

                  {visitingCardUrl ? (
                    <span className="text-[8px] font-black text-emerald-400">
                      ✓ UPLOADED
                    </span>
                  ) : null}
                </div>

                {visitingCardUrl ? (
                  <div className="relative mt-2 overflow-hidden rounded-xl border border-white/10">
                    <img
                      src={
                        visitingCardUrl
                      }
                      alt="Visiting card"
                      className="h-40 w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setVisitingCardUrl(
                          "",
                        )
                      }
                      className="absolute right-2 top-2 rounded-full bg-black/75 px-3 py-1.5 text-[8px] font-black text-white"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="mt-2 flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#D4AF37]/35 bg-[#D4AF37]/[0.04] text-center">
                    <span className="text-2xl">
                      ▣
                    </span>

                    <span className="mt-2 text-[9px] font-black text-[#D4AF37]">
                      {uploadingDocument ===
                      "CARD"
                        ? "Uploading..."
                        : "Upload Visiting Card"}
                    </span>

                    <span className="mt-1 text-[8px] text-white/30">
                      Camera / Gallery
                    </span>

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      disabled={
                        uploadingDocument !==
                        ""
                      }
                      onChange={(
                        event,
                      ) => {
                        const file =
                          event.target
                            .files?.[0];

                        if (file) {
                          void uploadVisitingCard(
                            file,
                          );
                        }

                        event.target.value =
                          "";
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* SHOP PHOTOS */}
              <div className="mt-5 border-t border-white/[0.07] pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-white/70">
                    Shop Photos *
                  </p>

                  <span className="text-[8px] text-white/35">
                    {shopPhotoUrls.length}/3
                  </span>
                </div>

                <p className="mt-1 text-[8px] leading-4 text-white/30">
                  Shop front, inside view లేదా stock display photos.
                </p>

                {shopPhotoUrls.length >
                0 ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {shopPhotoUrls.map(
                      (
                        url,
                        index,
                      ) => (
                        <div
                          key={url}
                          className="relative aspect-square overflow-hidden rounded-xl border border-white/10"
                        >
                          <img
                            src={url}
                            alt={`Shop photo ${
                              index + 1
                            }`}
                            className="h-full w-full object-cover"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShopPhotoUrls(
                                (
                                  current,
                                ) =>
                                  current.filter(
                                    (
                                      _,
                                      photoIndex,
                                    ) =>
                                      photoIndex !==
                                      index,
                                  ),
                              )
                            }
                            className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/75 text-[10px] text-white"
                          >
                            ×
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                ) : null}

                {shopPhotoUrls.length <
                3 ? (
                  <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] py-4">
                    <span className="text-[9px] font-black text-white/60">
                      {uploadingDocument ===
                      "SHOP"
                        ? "Uploading Shop Photos..."
                        : "+ Add Shop Photos"}
                    </span>

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      capture="environment"
                      disabled={
                        uploadingDocument !==
                        ""
                      }
                      onChange={(
                        event,
                      ) => {
                        if (
                          event.target
                            .files
                        ) {
                          void uploadShopPhotos(
                            event.target
                              .files,
                          );
                        }

                        event.target.value =
                          "";
                      }}
                      className="hidden"
                    />
                  </label>
                ) : null}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs leading-5 text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-[1rem] bg-[#D4AF37] py-4 text-[10px] font-black uppercase tracking-[0.12em] text-black disabled:opacity-50"
            >
              {saving
                ? "Submitting..."
                : "Submit Reseller Application →"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
