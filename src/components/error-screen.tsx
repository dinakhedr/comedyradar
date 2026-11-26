import { MicIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { errorReference } from "@/lib/error-ref";

const EMAIL = "comedyradarnetwork@gmail.com";

/** Error page (spec 7.6 item 2): "ERROR 500", "Static on the line", Try again, homepage, email and a reference. */
export function ErrorScreen({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const ref = errorReference(error);
  const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(`Error on Comedy Radar${ref ? ` (${ref})` : ""}`)}`;
  return (
    <>
      <header className="mx-auto flex max-w-[1280px] items-center px-[18px] py-3.5 md:px-8 md:py-5">
        <Logo />
      </header>
      <main className="mx-auto flex max-w-[720px] flex-col items-center gap-5 px-[18px] py-16 text-center">
        <MicIcon size={96} className="text-lavender-text" />
        <p className="text-label font-extrabold tracking-widest text-laugh-pink">
          ERROR 500
        </p>
        <h1 className="font-display text-[40px] leading-none md:text-display-xl">
          Static on the <span className="text-spotlight-yellow">line</span>
        </h1>
        <p className="text-base text-lavender-text md:text-lg">
          Something went wrong on our side. Please try again in a moment.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex min-h-11 items-center rounded-button bg-spotlight-yellow px-5 font-extrabold text-radar-purple hover:bg-white"
          >
            Try again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full page load also clears a broken state */}
          <a
            href="/"
            className="inline-flex min-h-11 items-center rounded-button border-2 border-plum-line px-5 font-bold hover:border-spotlight-yellow"
          >
            Go to the homepage
          </a>
        </div>
        <p className="text-small text-lavender-text md:text-base">
          Still not working? Email us at{" "}
          <a
            href={mail}
            className="font-bold text-spotlight-yellow underline hover:text-white"
          >
            {EMAIL}
          </a>
          {ref ? " and include the reference below." : "."}
        </p>
        {ref && (
          <p className="text-small text-lavender-text">
            Error reference:{" "}
            <code className="font-bold text-white select-all">{ref}</code>
          </p>
        )}
      </main>
    </>
  );
}
