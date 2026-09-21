export default function ProductFilters({ filters, onChange, categories }) {
  return (
    <div className="grid gap-4 rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-glow md:grid-cols-4">
      <input
        className="rounded-2xl border-slate-200"
        name="search"
        placeholder="Search fits, tags, categories"
        value={filters.search}
        onChange={onChange}
      />
      <select className="rounded-2xl border-slate-200" name="category" value={filters.category} onChange={onChange}>
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <select className="rounded-2xl border-slate-200" name="sort" value={filters.sort} onChange={onChange}>
        <option value="featured">Featured</option>
        <option value="price-asc">Price low to high</option>
        <option value="price-desc">Price high to low</option>
        <option value="rating">Best rated</option>
      </select>
      <input
        className="rounded-2xl border-slate-200"
        name="budget"
        type="number"
        placeholder="Budget"
        value={filters.budget}
        onChange={onChange}
      />
    </div>
  );
}
