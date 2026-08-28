import { redirect } from "next/navigation";
import { localePath } from "@/lib/locale";

// Edit project kini lewat /submit (wallet-based, "project kamu"), bukan editCode lagi.
export default async function EditProjectRedirect(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  redirect(localePath(params.locale, "/submit"));
}
