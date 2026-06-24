import { CustomVideoPlayer } from "./CustomVideoPlayer";

function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return /^[\w-]{6,}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id && /^[\w-]{6,}$/.test(id) ? id : null;
      }
      const m = u.pathname.match(/^\/(embed|shorts)\/([\w-]{6,})/);
      if (m) return m[2];
    }
    return null;
  } catch {
    return null;
  }
}

function isDirectVideo(url: string): boolean {
  // Uploaded files live under /uploads/videos/ — same-origin, always playable as <video>.
  if (url.startsWith("/uploads/")) return true;
  try {
    const u = new URL(url);
    return /\.(mp4|webm|mov|ogg)$/i.test(u.pathname);
  } catch {
    return false;
  }
}

export function VideoPlayer({ url }: { url: string }) {
  const youTubeId = parseYouTubeId(url);

  if (youTubeId) {
    return (
      <div className="relative w-full overflow-hidden rounded-md border border-slate-200 bg-black"
           style={{ aspectRatio: "16 / 9" }}>
        <iframe
          src={`https://www.youtube.com/embed/${youTubeId}`}
          title="Video demonstration"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  if (isDirectVideo(url)) {
    return <CustomVideoPlayer src={url} />;
  }

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      Video link:{" "}
      <a href={url} target="_blank" rel="noopener noreferrer"
         className="text-accent hover:underline">
        {url}
      </a>
    </div>
  );
}
