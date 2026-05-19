"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Smartphone, Copy, Loader2, FileDown } from "lucide-react";
import { downloadHealthReportPdf } from "@/lib/healthReportPdf";
import { t, type UILang } from "@/lib/triageLocale";
import { getStoredUILang } from "@/lib/uiLang";
import { loadLastTriage } from "@/lib/triagePersistence";
import {
  buildShareText,
  buildSmsHref,
  normalizeIndiaMobileDigits,
  openWhatsAppShare,
} from "@/lib/shareReport";

export default function ShareReportPanel() {
  const [lang, setLang] = useState<UILang>(() => getStoredUILang());
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const onLang = (e: Event) => {
      const ce = e as CustomEvent<{ lang?: UILang }>;
      if (ce.detail?.lang === "en" || ce.detail?.lang === "hi" || ce.detail?.lang === "kn") {
        setLang(ce.detail.lang);
      }
    };
    window.addEventListener("v-ui-lang", onLang);
    return () => window.removeEventListener("v-ui-lang", onLang);
  }, []);

  const d = t(lang);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const prepareShare = useCallback(async () => {
    if (!loadLastTriage()) {
      showToast(d.shareNoReport);
      return null;
    }
    setBusy(true);
    try {
      return await buildShareText(lang);
    } finally {
      setBusy(false);
    }
  }, [d.shareNoReport, lang, showToast]);

  const onWhatsApp = async () => {
    const msisdn = normalizeIndiaMobileDigits(phone);
    if (!msisdn) {
      showToast(d.shareInvalid);
      return;
    }
    const text = await prepareShare();
    if (!text) return;
    openWhatsAppShare(msisdn, text);
  };

  const onCopy = async () => {
    const text = await prepareShare();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(d.shareCopied);
    } catch {
      showToast(d.shareCopyFail);
    }
  };

  const smsHref = async (): Promise<string | null> => {
    const msisdn = normalizeIndiaMobileDigits(phone);
    if (!msisdn) {
      showToast(d.shareInvalid);
      return null;
    }
    const text = await prepareShare();
    if (!text) return null;
    return buildSmsHref(msisdn, text);
  };

  return (
    <div className="glass rounded-[32px] p-8 border border-white/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-v-cyan/5 blur-3xl rounded-full pointer-events-none" />
      <h3 className="text-sm font-black uppercase tracking-widest text-white mb-2">{d.shareTitle}</h3>
      <p className="text-xs text-v-muted font-light leading-relaxed mb-6 max-w-xl">{d.shareSubtitle}</p>

      <label className="text-[9px] font-mono text-v-muted uppercase block mb-1.5">{d.sharePhoneLabel}</label>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder={d.sharePhonePlaceholder}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full max-w-md bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm mb-2 font-mono"
      />
      <p className="text-[10px] text-v-muted/80 mb-6">{d.sharePhoneHint}</p>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onWhatsApp()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-mono uppercase tracking-wider disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" size={18} /> : <MessageCircle size={18} />}
          {d.shareWhatsApp}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const href = await smsHref();
            if (href) window.location.href = href;
          }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 hover:border-v-cyan/40 text-xs font-mono uppercase tracking-wider text-v-text disabled:opacity-50"
        >
          <Smartphone size={18} className="text-v-cyan" />
          {d.shareSms}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void onCopy()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 hover:border-v-emerald/40 text-xs font-mono uppercase tracking-wider text-v-muted disabled:opacity-50"
        >
          <Copy size={18} />
          {d.shareCopyText}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            if (!loadLastTriage()) {
              showToast(d.shareNoReport);
              return;
            }
            setBusy(true);
            try {
              await downloadHealthReportPdf();
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 hover:border-v-cyan/40 text-xs font-mono uppercase tracking-wider text-v-cyan disabled:opacity-50"
        >
          <FileDown size={18} />
          {d.reportPdfDownload}
        </button>
      </div>

      <p className="text-[10px] text-v-muted/70 mt-6 leading-relaxed">{d.shareNote}</p>

      {busy && (
        <p className="text-[10px] text-v-cyan mt-3 font-mono uppercase tracking-widest">{d.shareBuildWait}</p>
      )}
      {toast && (
        <p className="text-[11px] text-v-emerald mt-3 font-mono" role="status">
          {toast}
        </p>
      )}
    </div>
  );
}
