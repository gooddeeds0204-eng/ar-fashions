"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import {
  RETAILER_CITIES,
  normalizeRetailerState,
  type RetailerState,
} from "@/lib/retailer-locations";

type AccountType =
  | "RETAIL"
  | "RESELLER";

export default function SignupPage() {
  const router = useRouter();

  const [accountType, setAccountType] =
    useState<AccountType>(
      "RETAIL",
    );

  useEffect(() => {
    const requestedType =
      new URLSearchParams(
        window.location.search,
      ).get("type");

    if (
      requestedType === "retailer" ||
      requestedType === "reseller"
    ) {
      setAccountType(
        "RESELLER",
      );
    }
  }, []);

  const [name, setName] =
    useState("");
  const [phone, setPhone] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");

  const [
    businessName,
    setBusinessName,
  ] = useState("");

  const [
    businessPhone,
    setBusinessPhone,
  ] = useState("");

  const [gstNumber, setGstNumber] =
    useState("");

  const [
    addressLine,
    setAddressLine,
  ] = useState("");

  const [city, setCity] =
    useState("");

  const [state, setState] =
    useState<RetailerState | "">("");

  const [
    detectedCity,
    setDetectedCity,
  ] = useState("");

  const [pincode, setPincode] =
    useState("");

  const [mapsUrl, setMapsUrl] =
    useState("");

  const [
    locationStatus,
    setLocationStatus,
  ] = useState<
    "IDLE" | "LOADING" | "SUCCESS" | "ERROR"
  >("IDLE");

  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  const isReseller =
    accountType === "RESELLER";

  function requestCurrentLocation() {
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
        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        setMapsUrl(
          `https://www.google.com/maps?q=${latitude},${longitude}`,
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
                    latitude,
                    longitude,
                  }),
              },
            );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ??
                "Unable to detect address.",
            );
          }

          const detectedState =
            normalizeRetailerState(
              String(
                data.state ?? "",
              ),
            );

          if (!detectedState) {
            setLocationStatus(
              "ERROR",
            );
            setError(
              "Current shop location must be in Andhra Pradesh or Telangana.",
            );
            return;
          }

          const nextCity =
            String(
              data.city ?? "",
            ).trim();

          setState(
            detectedState,
          );

          setCity(
            nextCity,
          );

          setDetectedCity(
            nextCity,
          );

          if (
            data.addressLine
          ) {
            setAddressLine(
              String(
                data.addressLine,
              ),
            );
          }

          if (
            data.pincode
          ) {
            setPincode(
              String(
                data.pincode,
              )
                .replace(
                  /\D/g,
                  "",
                )
                .slice(
                  0,
                  6,
                ),
            );
          }

          setLocationStatus(
            "SUCCESS",
          );
        } catch (error) {
          setLocationStatus(
            "ERROR",
          );

          setError(
            error instanceof Error
              ? error.message
              : "Unable to detect address from current location.",
          );
        }
      },

      () => {
        setLocationStatus(
          "ERROR",
        );

        setError(
          "Location permission allow chesi malli try cheyyandi.",
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
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/auth/signup",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              accountType,
              name,
              phone,
              email,
              password,
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
            "Unable to create account.",
        );
      }

      if (isReseller) {
        router.replace(
          "/reseller-apply?complete=1",
        );
      } else {
        router.replace("/");
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create account.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-3.5 text-sm text-[#211C18] outline-none placeholder:text-[#7B7066] focus:border-[#D4AF37]/60";

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 py-6 text-[#211C18]">
      <div className="mx-auto max-w-lg">
        <header className="flex items-center justify-between">
          <BrandLogo
            compact
            onClick={() =>
              router.push("/")
            }
          />

          <button
            type="button"
            onClick={() =>
              router.push("/login")
            }
            className="rounded-full border border-[#E4D7C4] bg-[#FFFDF9] px-4 py-2 text-[9px] font-black uppercase tracking-wider text-[#7B7066]"
          >
            Sign In
          </button>
        </header>

        <section className="py-10">
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#D4AF37]">
            Join AS Fashions
          </p>

          <h1 className="mt-4 font-serif text-5xl leading-[0.94]">
            Choose your
            <br />
            AS experience.
          </h1>

          <p className="mt-5 text-sm leading-6 text-[#7B7066]">
            Customer accounts shop at
            retail prices. Reseller
            accounts unlock wholesale
            pricing only after AS Fashions
            approval.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setAccountType(
                  "RETAIL",
                );
                setError("");
              }}
              className={`rounded-[1.4rem] border p-4 text-left transition ${
                !isReseller
                  ? "border-[#211C18] bg-[#211C18] text-[#FFFDF9]"
                  : "border-[#E4D7C4] bg-[#FFFDF9] text-[#211C18]"
              }`}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.16em]">
                Customer
              </p>

              <p className="mt-2 text-sm font-black">
                Shop as Customer
              </p>

              <p
                className={`mt-2 text-[9px] leading-4 ${
                  !isReseller
                    ? "text-zinc-500"
                    : "text-[#7B7066]"
                }`}
              >
                Retail pricing · normal
                shopping
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType(
                  "RESELLER",
                );
                setError("");

                if (!mapsUrl) {
                  requestCurrentLocation();
                }
              }}
              className={`rounded-[1.4rem] border p-4 text-left transition ${
                isReseller
                  ? "border-[#D4AF37] bg-[#D4AF37] text-[#031B14]"
                  : "border-[#E4D7C4] bg-[#FFFDF9] text-[#211C18]"
              }`}
            >
              <p className="text-[9px] font-black uppercase tracking-[0.16em]">
                Reseller
              </p>

              <p className="mt-2 text-sm font-black">
                Register as Reseller
              </p>

              <p
                className={`mt-2 text-[9px] leading-4 ${
                  isReseller
                    ? "text-[#211C18]/60"
                    : "text-[#7B7066]"
                }`}
              >
                Wholesale pricing ·
                approval required
              </p>
            </button>
          </div>

          <form
            onSubmit={submit}
            className="mt-7 space-y-4"
          >
            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder="Full name"
              className={inputClass}
            />

            <input
              value={phone}
              onChange={(event) =>
                setPhone(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 10),
                )
              }
              inputMode="numeric"
              placeholder="10-digit mobile number"
              className={inputClass}
            />

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value,
                )
              }
              placeholder={
                isReseller
                  ? "Email address *"
                  : "Email address (optional)"
              }
              className={inputClass}
            />

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              autoComplete="new-password"
              placeholder="Password · minimum 8 characters"
              className={inputClass}
            />

            {isReseller ? (
              <div className="space-y-4 rounded-[1.5rem] border border-[#D4AF37]/20 bg-[#D4AF37]/[0.05] p-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#D9C29A]">
                    Business Details
                  </p>

                  <p className="mt-1 text-[9px] leading-4 text-[#7B7066]">
                    Step 1: create the reseller account with business details.
                    Step 2 opens automatically for live shop location,
                    visiting card and 1–3 shop photos before review.
                  </p>
                </div>

                <input
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
                  value={businessPhone}
                  onChange={(event) =>
                    setBusinessPhone(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10),
                    )
                  }
                  inputMode="numeric"
                  placeholder="Business / WhatsApp mobile number *"
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
                  value={addressLine}
                  onChange={(event) =>
                    setAddressLine(
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Full shop / business address *"
                  className={`${inputClass} resize-none`}
                />

                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={state}
                    onChange={(event) => {
                      const nextState =
                        event.target
                          .value as RetailerState | "";

                      setState(
                        nextState,
                      );
                      setCity("");
                      setDetectedCity("");
                    }}
                    required
                    className={inputClass}
                  >
                    <option value="">
                      Select State *
                    </option>

                    <option value="Andhra Pradesh">
                      Andhra Pradesh
                    </option>

                    <option value="Telangana">
                      Telangana
                    </option>
                  </select>

                  <select
                    value={city}
                    onChange={(event) =>
                      setCity(
                        event.target.value,
                      )
                    }
                    required
                    disabled={!state}
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <option value="">
                      {state
                        ? "Select City / Town *"
                        : "Select State First"}
                    </option>

                    {detectedCity &&
                    state &&
                    !RETAILER_CITIES[
                      state
                    ].includes(
                      detectedCity,
                    ) ? (
                      <option value={detectedCity}>
                        {detectedCity}
                      </option>
                    ) : null}

                    {state
                      ? RETAILER_CITIES[
                          state
                        ].map(
                          (
                            cityName,
                          ) => (
                            <option
                              key={
                                cityName
                              }
                              value={
                                cityName
                              }
                            >
                              {
                                cityName
                              }
                            </option>
                          ),
                        )
                      : null}
                  </select>
                </div>

                <input
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

                <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.05] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#D9C29A]">
                        Shop Location
                      </p>

                      <p className="mt-1 text-[9px] leading-4 text-[#7B7066]">
                        Button tap chesthe current shop location capture ayi full address, State, City / Town, pincode automatic ga fill avutayi.
                      </p>
                    </div>

                    {locationStatus ===
                    "SUCCESS" ? (
                      <span className="rounded-full bg-[#D4AF37] px-2.5 py-1 text-[8px] font-black text-[#031B14]">
                        CAPTURED
                      </span>
                    ) : null}
                  </div>

                  {locationStatus ===
                  "LOADING" ? (
                    <div className="mt-3 rounded-xl border border-[#E4D7C4] bg-[#F1E8DA] p-3 text-[9px] font-semibold text-[#7B7066]">
                      📍 Getting current location...
                    </div>
                  ) : null}

                  {locationStatus ===
                  "SUCCESS" ? (
                    <div className="mt-3 rounded-xl border border-[#D4AF37]/20 bg-black/20 p-3">
                      <p className="text-[9px] font-bold text-[#D9C29A]">
                        ✓ Location & address filled automatically
                      </p>

                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-[9px] font-black text-white underline underline-offset-4"
                      >
                        Preview in Google Maps ↗
                      </a>
                    </div>
                  ) : null}

                  {locationStatus ===
                  "ERROR" ? (
                    <div className="mt-3 rounded-xl border border-amber-300/15 bg-amber-400/[0.06] p-3">
                      <p className="text-[9px] leading-4 text-amber-200">
                        Location permission allow cheyyandi, taruvata button press cheyyandi.
                      </p>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={
                      requestCurrentLocation
                    }
                    disabled={
                      locationStatus ===
                      "LOADING"
                    }
                    className="mt-3 w-full rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 py-3 text-[9px] font-black uppercase tracking-wider text-[#D9C29A] disabled:opacity-40"
                  >
                    {locationStatus ===
                    "SUCCESS"
                      ? "↻ Update Current Location"
                      : "◎ Use Current Location"}
                  </button>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-xs font-semibold leading-5 text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-white py-4 text-[11px] font-black uppercase tracking-[0.12em] text-[#031B14] transition active:scale-[0.99] disabled:opacity-40"
            >
              {loading
                ? "Creating Account..."
                : isReseller
                  ? "Continue to Shop Verification →"
                  : "Create Customer Account →"}
            </button>
          </form>

          {isReseller ? (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                [
                  "01",
                  "Register",
                ],
                [
                  "02",
                  "AS Review",
                ],
                [
                  "03",
                  "Wholesale Unlock",
                ],
              ].map(
                ([number, label]) => (
                  <div
                    key={number}
                    className="rounded-xl border border-[#E4D7C4] bg-[#FFFDF9] p-3"
                  >
                    <p className="text-[8px] font-black text-[#D4AF37]">
                      {number}
                    </p>

                    <p className="mt-1 text-[8px] font-bold text-[#7B7066]">
                      {label}
                    </p>
                  </div>
                ),
              )}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
