import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function SectionHeader({
  eyebrow,
  title,
  description,
  actionText,
  actionLink,
  className = "",
  centered = false
}) {
  return (
    <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 ${centered ? "text-center md:text-center items-center justify-center" : ""} ${className}`}>
      <div className="space-y-3 max-w-2xl">
        {eyebrow && (
          <span className="text-2xs uppercase tracking-[0.25em] font-bold text-cm-red bg-cm-red/10 px-3 py-1 rounded-full inline-block">
            {eyebrow}
          </span>
        )}
        {title && (
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-cm-black">
            {title}
          </h2>
        )}
        {description && (
          <p className="text-cm-muted text-base leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actionText && actionLink && (
        <Link
          to={actionLink}
          className="inline-flex items-center gap-2 font-medium text-sm text-cm-black hover:text-cm-red transition-colors group shrink-0"
        >
          <span>{actionText}</span>
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
