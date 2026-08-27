import EditFlow from "@/components/EditFlow";
import { getDict } from "@/lib/i18n";

export default function EditProjectPage({ params }: { params: { id: string; locale: string } }) {
  const dict = getDict(params.locale);

  return (
    <div className="min-h-full bg-haze">
      <div className="mx-auto max-w-3xl px-6 pb-20 pt-28 sm:px-10 sm:pt-32">
        <EditFlow id={params.id} locale={params.locale} t={dict.edit} form={dict.form} />
      </div>
    </div>
  );
}
