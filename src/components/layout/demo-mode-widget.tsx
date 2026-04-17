"use client";

import { useEffect, useState } from "react";
import { FlaskConical, X } from "lucide-react";

const LS_KEY = "keystone-demo-mode";

export function DemoModeWidget() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(localStorage.getItem(LS_KEY) === "1");
  }, []);

  function toggle() {
    const next = !active;
    setActive(next);
    localStorage.setItem(LS_KEY, next ? "1" : "0");
  }

  function dismiss() {
    setActive(false);
    localStorage.setItem(LS_KEY, "0");
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
          active
            ? "border border-amber-300 bg-amber-100 text-amber-700"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        aria-pressed={active}
        title="Toggle demo mode overlay"
      >
        <FlaskConical className="h-3.5 w-3.5" aria-hidden />
        Demo
      </button>

      {active && (
        <div className="fixed left-0 right-0 top-14 z-30 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm shadow-sm">
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-4">
            <div className="space-y-1.5">
              <p className="font-semibold text-amber-800">Demo Mode — Synthetic Data Active</p>
              <div className="space-y-1 text-amber-700">
                <p>
                  <span className="font-mono font-medium">KS-2026-0142</span> — Rear-end collision, I-80 MM 312 Kearney NE ·{" "}
                  <span className="font-semibold text-emerald-700">STRONG DEFENSE POSITION</span>{" "}
                  <span className="text-amber-600">(compliant speed, clean DVIR, 5.75h HOS remaining)</span>
                </p>
                <p>
                  <span className="font-mono font-medium">KS-2026-0157</span> — Lane change incident, I-95 MM 11.2 Woodbridge NJ ·{" "}
                  <span className="font-semibold text-red-700">UNFAVORABLE — CONSIDER SETTLEMENT</span>{" "}
                  <span className="text-amber-600">(3–11 mph over limit, dual fatigue indicator, 2 unresolved brake defects)</span>
                </p>
              </div>
              <p className="text-xs text-amber-600">
                All data is synthetic and generated for demonstration purposes only. Not legal advice.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="mt-0.5 shrink-0 text-amber-600 hover:text-amber-900"
              aria-label="Dismiss demo banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
