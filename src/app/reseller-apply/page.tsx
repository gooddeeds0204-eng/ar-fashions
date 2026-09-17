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
  mapsUrl?: string | null;
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
  const [mapsUrl, setMapsUrl] =
    useState("");

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
          setMapsUrl(
            application.mapsUrl ?? "",
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
              mapsUrl,
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

            <input
              value={mapsUrl}
              onChange={(event) =>
                setMapsUrl(
                  event.target.value,
                )
              }
              placeholder="Google Maps link (optional)"
              className={inputClass}
            />

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
