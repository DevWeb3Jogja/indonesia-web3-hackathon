import type { Metadata } from "next";
import SubmitFlow from "@/components/SubmitFlow";
import { getDict } from "@/lib/i18n";

export function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Metadata {
  return { title: getDict(params.locale).submit.metaTitle };
}

export default function SubmitPage({ params }: { params: { locale: string } }) {
  const dict = getDict(params.locale);

  return (
    <div className="min-h-full bg-haze">
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 sm:px-10 sm:pt-32">
        <SubmitFlow locale={params.locale} t={dict.submit} form={dict.form} />
      </div>
    </div>
  );
}
