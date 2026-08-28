import { redirect } from "next/navigation";
import { localePath } from "@/lib/locale";

// Edit project kini lewat /submit (wallet-based, "project kamu"), bukan editCode lagi.
export default function EditProjectRedirect({ params }: { params: { locale: string } }) {
  redirect(localePath(params.locale, "/submit"));
}
