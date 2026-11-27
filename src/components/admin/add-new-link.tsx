import Link from "next/link";
import { outlineBtn, yellowBtn } from "@/components/dashboard/ui";
import { PlusIcon } from "@/components/icons";
import { LinkPending } from "@/components/link-pending";

/** The "Add new …" button beside an admin page title. */
export function AddNewLink({ href, children, outline = false }: { href: string; children: React.ReactNode; outline?: boolean }) {
  return (
    <Link href={href} className={`${outline ? `${outlineBtn} bg-white` : yellowBtn} shrink-0`}>
      <LinkPending>
        <PlusIcon />
      </LinkPending>
      {children}
    </Link>
  );
}
