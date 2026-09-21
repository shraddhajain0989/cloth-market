export default function Badge({
  children,
  variant = "new",
  className = ""
}) {
  const variants = {
    new: "badge-new",
    trending: "badge-trending",
    limited: "badge-limited",
    sale: "badge-sale",
    hot: "badge-hot",
    rent: "badge-rent"
  };

  return (
    <span className={`badge ${variants[variant?.toLowerCase()] || variants.new} ${className}`}>
      {children}
    </span>
  );
}
