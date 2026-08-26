"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export function StickerResult({
  title,
  productName,
  storageTempRangeLabel,
  tenantName,
  madeAt,
  expiresAt,
  weightKg,
  staffName,
  qrCodeDataUrl,
  publicUrl,
  secondaryAction,
}: {
  title: string;
  productName: string;
  storageTempRangeLabel: string;
  tenantName: string;
  madeAt: string;
  expiresAt: string;
  weightKg: string;
  staffName: string;
  qrCodeDataUrl: string;
  publicUrl: string;
  secondaryAction: React.ReactNode;
}) {
  return (
    <>
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCodeDataUrl}
            alt={`QR code linking to ${publicUrl}`}
            className="w-64 h-64 rounded-lg border bg-white p-2"
          />
          <div className="text-center">
            <p className="font-heading text-xl font-semibold tracking-wide">
              {productName}
            </p>
            {staffName && (
              <p className="text-sm text-muted-foreground">
                Made by {staffName}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button
              type="button"
              className="w-full h-12 text-base"
              onClick={() => window.print()}
            >
              Print sticker
            </Button>
            {secondaryAction}
          </div>
        </CardContent>
      </Card>

      {/* Print-only sticker layout: hidden on screen, shown only when
          printing (see the @page rule in app/globals.css sizing the
          printed page to a real sticker, ~92mm x 45mm). */}
      <div className="hidden print:flex print:box-border print:w-[92mm] print:h-[45mm] print:overflow-hidden print:gap-[3mm] print:p-[3mm]">
        <div className="flex flex-col gap-[0.5mm] flex-1 min-w-0 font-mono print:text-[7pt] print:leading-snug">
          <p className="font-heading font-semibold print:text-[9pt]">
            {productName}
          </p>
          <p>Made: {formatDateTime(madeAt)}</p>
          <p>Best before: {formatDateTime(expiresAt)}</p>
          {storageTempRangeLabel && <p>Storage: {storageTempRangeLabel}</p>}
          {weightKg && <p>Weight: {weightKg} kg</p>}
          {staffName && <p>By: {staffName}</p>}
          {tenantName && <p>{tenantName}</p>}
        </div>
        <div className="flex items-center justify-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCodeDataUrl}
            alt=""
            className="print:w-[32mm] print:h-[32mm]"
          />
        </div>
      </div>
    </>
  );
}
