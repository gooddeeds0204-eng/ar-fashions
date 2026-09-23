"use client";

import {
  useEffect,
  useState,
} from "react";

type Settings = {
  supportPhone: string;
  whatsappNumber: string;
  supportEmail: string;
};

export default function ContactDetails() {
  const [settings, setSettings] =
    useState<Settings>({
      supportPhone: "",
      whatsappNumber: "",
      supportEmail: "",
    });

  useEffect(() => {
    void fetch("/api/site-settings", {
      cache: "no-store",
    })
      .then((response) =>
        response.json(),
      )
      .then((data) => {
        const value =
          data?.settings ?? {};

        setSettings({
          supportPhone:
            String(
              value.supportPhone ??
                "",
            ).trim(),
          whatsappNumber:
            String(
              value.whatsappNumber ??
                "",
            ).trim(),
          supportEmail:
            String(
              value.supportEmail ??
                "",
            ).trim(),
        });
      })
      .catch(() => undefined);
  }, []);

  const whatsapp =
    settings.whatsappNumber.replace(
      /\D/g,
      "",
    );

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {settings.supportPhone ? (
        <a
          href={`tel:${settings.supportPhone}`}
          className="rounded-2xl border border-[#E4D7C4] bg-[#FAF7F0] p-4"
        >
          <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-[#0F5A38]">
            Phone
          </span>
          <span className="mt-2 block text-sm font-bold text-[#211C18]">
            {settings.supportPhone}
          </span>
        </a>
      ) : null}

      {settings.supportEmail ? (
        <a
          href={`mailto:${settings.supportEmail}`}
          className="rounded-2xl border border-[#E4D7C4] bg-[#FAF7F0] p-4"
        >
          <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-[#0F5A38]">
            Email
          </span>
          <span className="mt-2 block break-all text-sm font-bold text-[#211C18]">
            {settings.supportEmail}
          </span>
        </a>
      ) : null}

      {whatsapp ? (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl border border-[#B9D8C7] bg-[#EDF7F1] p-4"
        >
          <span className="block text-[8px] font-black uppercase tracking-[0.14em] text-[#0F5A38]">
            WhatsApp
          </span>
          <span className="mt-2 block text-sm font-bold text-[#0F5A38]">
            Chat with support
          </span>
        </a>
      ) : null}

      {!settings.supportPhone &&
      !settings.supportEmail &&
      !whatsapp ? (
        <p className="sm:col-span-3">
          Support contact details are being updated. Please check the website again shortly.
        </p>
      ) : null}
    </div>
  );
}
