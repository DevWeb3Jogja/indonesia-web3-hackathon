import { youtubeId } from "@/lib/utils";
import { ArrowUpRight } from "./ui";

export default function YouTubeEmbed({ url, label }: { url: string; label: string }) {
  const id = youtubeId(url);
  if (!id) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-outline border border-teal/25"
      >
        {label}
        <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
    );
  }
  return (
    <div className="chamfer-lg overflow-hidden bg-black">
      <div className="relative aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${id}`}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
